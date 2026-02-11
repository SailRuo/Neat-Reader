const express = require('express');
const router = express.Router();
const qwenService = require('../services/qwenService');
const logger = require('../utils/logger');
const fileProcessor = require('../utils/fileProcessor');

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
 * 支持多模态：文本 + 图片（Base64）
 */
router.post('/chat-stream', async (req, res) => {
  try {
    const { access_token, message, images, resource_url } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'access_token is required' });
    }
    
    const userMessage = message || '你好，请用一句话介绍你自己。';
    
    // 构建多模态消息（支持图片）- 按照 OpenAI 兼容格式
    let messageContent;
    if (images && images.length > 0) {
      // 多模态格式：图片 + 文本（顺序很重要）
      messageContent = [];
      
      // 先添加所有图片
      images.forEach((imageBase64, index) => {
        // 确保图片格式正确（必须是 data:image/...;base64,... 格式）
        let imageUrl = imageBase64;
        if (!imageUrl.startsWith('data:image/')) {
          // 如果没有前缀，假设是纯 Base64，添加 JPEG 前缀
          imageUrl = `data:image/jpeg;base64,${imageUrl}`;
          logger.warn(`图片 ${index + 1} 缺少 data URI 前缀，已自动添加`);
        }
        
        messageContent.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      });
      
      // 再添加文本
      messageContent.push({
        type: 'text',
        text: userMessage
      });
      
      logger.info('发送多模态消息', { 
        textLength: userMessage.length, 
        imageCount: images.length,
        firstImagePrefix: images[0]?.substring(0, 30) + '...'
      });
    } else {
      // 纯文本格式
      messageContent = userMessage;
    }
    
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // 根据是否有图片选择合适的模型
    // 注意：根据 Qwen Code CLI 的实际测试，qwen3-coder-plus 也支持图像理解
    const model = (images && images.length > 0) 
      ? 'qwen3-coder-plus'  // 支持 vision 的代码模型（经测试确认）
      : 'qwen3-coder-plus';  // 纯文本也使用同一模型
    
    logger.info('选择模型', { model, hasImages: !!(images && images.length > 0) });
    
    try {
      const stream = await qwenService.chatCompletionStream(
        access_token,
        [{ role: 'user', content: messageContent }],
        model,
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
    const { access_token, message, images, resource_url } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'access_token is required' });
    }
    
    const testMessage = message || '你好，请用一句话介绍你自己。';
    
    // 构建消息内容（支持图片）
    let messageContent;
    if (images && images.length > 0) {
      messageContent = [];
      
      images.forEach((imageBase64, index) => {
        let imageUrl = imageBase64;
        if (!imageUrl.startsWith('data:image/')) {
          imageUrl = `data:image/jpeg;base64,${imageUrl}`;
          logger.warn(`测试图片 ${index + 1} 缺少 data URI 前缀，已自动添加`);
        }
        
        messageContent.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      });
      
      messageContent.push({
        type: 'text',
        text: testMessage
      });
    } else {
      messageContent = testMessage;
    }
    
    // 根据是否有图片选择合适的模型
    // 注意：根据 Qwen Code CLI 的实际测试，qwen3-coder-plus 也支持图像理解
    const model = (images && images.length > 0) 
      ? 'qwen3-coder-plus'  // 支持 vision 的代码模型（经测试确认）
      : 'qwen3-coder-plus';  // 纯文本也使用同一模型
    
    const response = await qwenService.chatCompletion(
      access_token,
      [{ role: 'user', content: messageContent }],
      model,
      resource_url
    );
    
    logger.info('Qwen API 测试成功', { model, hasImages: !!(images && images.length > 0) });
    
    res.json({
      success: true,
      response: response.choices[0].message.content,
      usage: response.usage,
      model: model
    });
  } catch (error) {
    logger.error('Qwen API 测试失败', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

/**
 * 处理文件路径并发送到 Qwen（类似 Qwen Code 的 @relativePath）
 * POST /api/qwen/chat-with-files
 * 
 * 请求体：
 * {
 *   "access_token": "your_token",
 *   "message": "请分析这些文件",
 *   "file_paths": ["/path/to/file1.txt", "/path/to/image.jpg"],
 *   "resource_url": "portal.qwen.ai"
 * }
 */
router.post('/chat-with-files', async (req, res) => {
  try {
    const { access_token, message, file_paths, resource_url } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'access_token is required' });
    }
    
    if (!file_paths || !Array.isArray(file_paths) || file_paths.length === 0) {
      return res.status(400).json({ error: 'file_paths array is required' });
    }
    
    logger.info('处理文件路径请求', { 
      fileCount: file_paths.length,
      paths: file_paths 
    });
    
    // 处理所有文件
    const fileResults = await fileProcessor.processMultipleFiles(file_paths);
    
    // 检查是否有错误
    const errors = fileResults.filter(r => r.type === 'error');
    if (errors.length > 0) {
      logger.warn('部分文件处理失败', { errors });
    }
    
    // 转换为 OpenAI 消息格式
    const messageContent = fileProcessor.toOpenAIMessageFormat(
      fileResults.filter(r => r.type !== 'error'),
      message || '请分析这些文件内容'
    );
    
    logger.info('文件处理完成', {
      totalFiles: fileResults.length,
      successFiles: fileResults.filter(r => r.type !== 'error').length,
      textFiles: fileResults.filter(r => r.type === 'text').length,
      imageFiles: fileResults.filter(r => r.type === 'image').length
    });
    
    // 调用 Qwen API
    const response = await qwenService.chatCompletion(
      access_token,
      [messageContent],
      'qwen3-coder-plus',
      resource_url
    );
    
    res.json({
      success: true,
      response: response.choices[0].message.content,
      usage: response.usage,
      model: 'qwen3-coder-plus',
      files_processed: {
        total: fileResults.length,
        success: fileResults.filter(r => r.type !== 'error').length,
        errors: errors.map(e => ({ path: e.displayName, error: e.error }))
      }
    });
    
  } catch (error) {
    logger.error('文件处理请求失败', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 处理文件路径并流式返回（类似 Qwen Code 的 @relativePath）
 * POST /api/qwen/chat-with-files-stream
 */
router.post('/chat-with-files-stream', async (req, res) => {
  try {
    const { access_token, message, file_paths, resource_url } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'access_token is required' });
    }
    
    if (!file_paths || !Array.isArray(file_paths) || file_paths.length === 0) {
      return res.status(400).json({ error: 'file_paths array is required' });
    }
    
    logger.info('处理文件路径请求（流式）', { 
      fileCount: file_paths.length 
    });
    
    // 处理所有文件
    const fileResults = await fileProcessor.processMultipleFiles(file_paths);
    
    // 转换为 OpenAI 消息格式
    const messageContent = fileProcessor.toOpenAIMessageFormat(
      fileResults.filter(r => r.type !== 'error'),
      message || '请分析这些文件内容'
    );
    
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
      const stream = await qwenService.chatCompletionStream(
        access_token,
        [messageContent],
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
