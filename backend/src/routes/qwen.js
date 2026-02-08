const express = require('express');
const router = express.Router();
const qwenService = require('../services/qwenService');
const logger = require('../utils/logger');

// 存储轮询状态的临时缓存
const pollingSessions = new Map();

/**
 * 启动 Device Code Flow
 * POST /api/qwen/device-auth
 */
router.post('/device-auth', async (req, res) => {
  try {
    const deviceFlow = await qwenService.startDeviceFlow();
    
    // 缓存 device_code 和 code_verifier 用于轮询
    const sessionId = require('crypto').randomBytes(16).toString('hex');
    pollingSessions.set(sessionId, {
      device_code: deviceFlow.device_code,
      code_verifier: deviceFlow.code_verifier, // 保存 code_verifier
      expires_at: Date.now() + deviceFlow.expires_in * 1000,
      interval: deviceFlow.interval
    });
    
    // 清理过期的 session
    setTimeout(() => {
      pollingSessions.delete(sessionId);
    }, deviceFlow.expires_in * 1000);
    
    logger.info('Device Code Flow 启动成功', { sessionId });
    
    res.json({
      session_id: sessionId,
      user_code: deviceFlow.user_code,
      auth_url: deviceFlow.auth_url,
      verification_uri: deviceFlow.verification_uri,
      expires_in: deviceFlow.expires_in,
      interval: deviceFlow.interval
    });
  } catch (error) {
    logger.error('启动 Device Code Flow 失败', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 轮询获取 token
 * POST /api/qwen/poll-token
 */
router.post('/poll-token', async (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }
    
    const session = pollingSessions.get(session_id);
    if (!session) {
      return res.status(400).json({ error: 'Invalid or expired session' });
    }
    
    // 检查是否过期
    if (Date.now() > session.expires_at) {
      pollingSessions.delete(session_id);
      return res.status(400).json({ error: 'Session expired' });
    }
    
    // 轮询 token（传递 device_code 和 code_verifier）
    const result = await qwenService.pollForToken(
      session.device_code,
      session.code_verifier
    );
    
    if (result.pending) {
      // 还在等待授权
      return res.json({
        status: 'pending',
        slow_down: result.slow_down || false
      });
    }
    
    // 获取到 token，删除 session
    pollingSessions.delete(session_id);
    
    logger.info('成功获取 token');
    
    res.json({
      status: 'success',
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
      token_type: result.token_type,
      resource_url: result.resource_url
    });
  } catch (error) {
    logger.error('轮询 token 失败', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 刷新 token
 * POST /api/qwen/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token is required' });
    }
    
    const tokens = await qwenService.refreshToken(refresh_token);
    
    logger.info('成功刷新 token');
    
    res.json(tokens);
  } catch (error) {
    logger.error('刷新 token 失败', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取模型列表
 * POST /api/qwen/models
 */
router.post('/models', async (req, res) => {
  try {
    const { access_token, resource_url } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'access_token is required' });
    }
    
    const models = await qwenService.listModels(access_token, resource_url);
    
    logger.info('成功获取模型列表');
    
    res.json(models);
  } catch (error) {
    logger.error('获取模型列表失败', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 测试 Qwen API（流式）
 * POST /api/qwen/chat-stream
 */
router.post('/chat-stream', async (req, res) => {
  try {
    const { access_token, message, resource_url } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'access_token is required' });
    }
    
    const userMessage = message || '你好，请用一句话介绍你自己。';
    
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
      const stream = await qwenService.chatCompletionStream(
        access_token,
        [{ role: 'user', content: userMessage }],
        'qwen3-coder-plus',
        resource_url
      );
      
      let buffer = '';
      
      stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      });
      
      stream.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });
      
      stream.on('error', (error) => {
        logger.error('流式响应错误', { error: error.message });
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      });
      
    } catch (error) {
      logger.error('Qwen API 流式调用失败', { error: error.message });
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  } catch (error) {
    logger.error('流式请求处理失败', { error: error.message });
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * 测试 Qwen API
 * POST /api/qwen/test
 */
router.post('/test', async (req, res) => {
  try {
    const { access_token, message, resource_url } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'access_token is required' });
    }
    
    const testMessage = message || '你好，请用一句话介绍你自己。';
    
    const response = await qwenService.chatCompletion(
      access_token,
      [{ role: 'user', content: testMessage }],
      'qwen3-coder-plus',  // 使用 Qwen OAuth 支持的模型
      resource_url  // 传递 resource_url
    );
    
    logger.info('Qwen API 测试成功');
    
    res.json({
      success: true,
      response: response.choices[0].message.content,
      usage: response.usage
    });
  } catch (error) {
    logger.error('Qwen API 测试失败', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
