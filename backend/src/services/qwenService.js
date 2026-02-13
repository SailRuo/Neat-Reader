const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Qwen OAuth 配置（基于 CLIProxyAPI 的真实实现）
const QWEN_CONFIG = {
  clientId: 'f0304373b74a44d2b584a3fb70ca9e56',
  scope: 'openid profile email model.completion',
  deviceAuthUrl: 'https://chat.qwen.ai/api/v1/oauth2/device/code',
  tokenUrl: 'https://chat.qwen.ai/api/v1/oauth2/token',
  authPageUrl: 'https://chat.qwen.ai/authorize',
  // 注意：OAuth token 获取后，需要通过特定的 API 端点调用
  // CLIProxyAPI 使用的是 chat.qwen.ai 的代理端点，不是直接调用 dashscope
  apiUrl: 'https://chat.qwen.ai/api/v1',  // 使用 chat.qwen.ai 的 API
  pollInterval: 5000,
  pollTimeout: 300000
};

/**
 * 生成 PKCE (Proof Key for Code Exchange) 参数
 * 用于增强 OAuth 2.0 的安全性
 */
function generatePKCEPair() {
  // 1. 生成 code_verifier（32 字节随机数，Base64 URL 编码）
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // 2. 生成 code_challenge（code_verifier 的 SHA-256 哈希，Base64 URL 编码）
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = hash.toString('base64url');
  
  return { codeVerifier, codeChallenge };
}

/**
 * 启动 Device Code Flow
 * 基于 CLIProxyAPI 的真实实现
 */
async function startDeviceFlow() {
  try {
    logger.info('启动 Device Code Flow（使用 PKCE）');
    
    // 生成 PKCE 参数
    const { codeVerifier, codeChallenge } = generatePKCEPair();
    
    logger.info('PKCE 参数生成成功', {
      code_verifier_length: codeVerifier.length,
      code_challenge_length: codeChallenge.length
    });
    
    // 构造请求参数（使用 URLSearchParams，Content-Type 为 application/x-www-form-urlencoded）
    const params = new URLSearchParams({
      client_id: QWEN_CONFIG.clientId,
      scope: QWEN_CONFIG.scope,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    
    logger.info('发送 Device Code 请求', {
      url: QWEN_CONFIG.deviceAuthUrl,
      client_id: QWEN_CONFIG.clientId,
      scope: QWEN_CONFIG.scope
    });
    
    const response = await axios.post(
      QWEN_CONFIG.deviceAuthUrl,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Neat-Reader/1.0'
        },
        timeout: 30000  // 增加超时时间到 30 秒
      }
    );
    
    logger.info('Device Code 响应成功', {
      status: response.status,
      data: response.data
    });
    
    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      expires_in,
      interval
    } = response.data;
    
    // 检查响应是否成功
    if (!device_code) {
      throw new Error('Device code not found in response');
    }
    
    // 构造授权页面 URL（优先使用 verification_uri_complete）
    const authUrl = verification_uri_complete || 
                    `${verification_uri}?user_code=${user_code}`;
    
    logger.info('Device Code Flow 启动成功', {
      user_code,
      verification_uri,
      expires_in,
      interval
    });
    
    return {
      device_code,
      user_code,
      auth_url: authUrl,
      verification_uri,
      expires_in,
      interval: interval || 5,
      code_verifier: codeVerifier // 保存用于后续 token 请求
    };
  } catch (error) {
    logger.error('启动 Device Code Flow 失败', {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
      stack: error.stack
    });
    
    // 返回详细的错误信息
    let errorMsg = '启动授权失败';
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMsg = '无法连接到 Qwen 服务器，请检查网络连接';
    } else if (error.code === 'ETIMEDOUT') {
      errorMsg = '连接 Qwen 服务器超时，请检查网络';
    } else if (error.response?.status === 502) {
      errorMsg = 'Qwen 服务暂时不可用（502 Bad Gateway），请稍后重试';
    } else if (error.response?.status === 503) {
      errorMsg = 'Qwen 服务正在维护中（503 Service Unavailable），请稍后重试';
    } else if (error.response?.status >= 500) {
      errorMsg = `Qwen 服务器错误（${error.response.status}），请稍后重试`;
    } else if (error.response?.data?.error_description) {
      errorMsg = error.response.data.error_description;
    } else if (error.response?.data?.error) {
      errorMsg = error.response.data.error;
    } else {
      errorMsg = error.message;
    }
    
    throw new Error(errorMsg);
  }
}

/**
 * 轮询获取 token
 * 基于 CLIProxyAPI 的真实实现
 */
async function pollForToken(deviceCode, codeVerifier) {
  try {
    logger.info('轮询获取 token', { 
      device_code: deviceCode.substring(0, 10) + '...',
      code_verifier: codeVerifier.substring(0, 10) + '...'
    });
    
    // 构造请求参数（使用 URLSearchParams）
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode,
      client_id: QWEN_CONFIG.clientId,
      code_verifier: codeVerifier // PKCE 验证
    });
    
    const response = await axios.post(
      QWEN_CONFIG.tokenUrl,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Neat-Reader/1.0'
        },
        timeout: 10000
      }
    );
    
    logger.info('成功获取 token');
    logger.info('Token 响应详情', {
      has_access_token: !!response.data.access_token,
      has_refresh_token: !!response.data.refresh_token,
      has_resource_url: !!response.data.resource_url,
      resource_url: response.data.resource_url,
      expires_in: response.data.expires_in
    });
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type || 'Bearer',
      resource_url: response.data.resource_url
    };
  } catch (error) {
    // 处理特定错误（根据 OAuth RFC 8628）
    const errorCode = error.response?.data?.error;
    
    if (errorCode === 'authorization_pending') {
      // 用户还未授权，继续轮询
      logger.info('等待用户授权...');
      return { pending: true };
    } else if (errorCode === 'slow_down') {
      // 轮询太快，增加间隔
      logger.warn('轮询太快，需要减速');
      return { pending: true, slow_down: true };
    } else if (errorCode === 'expired_token') {
      // device_code 过期
      logger.error('Device code 已过期');
      throw new Error('授权超时，请重新开始');
    } else if (errorCode === 'access_denied') {
      // 用户拒绝授权
      logger.error('用户拒绝授权');
      throw new Error('用户拒绝授权');
    }
    
    // 其他错误
    logger.error('轮询 token 失败', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    throw new Error(
      `获取 token 失败: ${
        error.response?.data?.error_description || 
        error.response?.data?.error || 
        error.message
      }`
    );
  }
}

/**
 * 刷新 access token
 */
async function refreshToken(refreshToken) {
  try {
    logger.info('开始刷新 token');
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: QWEN_CONFIG.clientId
    });
    
    const response = await axios.post(
      QWEN_CONFIG.tokenUrl,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    logger.info('成功刷新 token');
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type
    };
  } catch (error) {
    logger.error('刷新 token 失败', {
      error: error.message,
      response: error.response?.data
    });
    throw new Error(error.response?.data?.error_description || '刷新 token 失败');
  }
}

/**
 * 获取可用的模型列表
 * 
 * @param {string} accessToken - OAuth access token
 * @param {string} resourceUrl - 从 token 响应中获取的 resource_url（可选）
 */
async function listModels(accessToken, resourceUrl = null) {
  try {
    logger.info('开始获取模型列表', { hasResourceUrl: !!resourceUrl });
    
    // 根据 CLIProxyAPI 的实现，使用 resource_url 构造 baseURL
    let apiBaseUrl;
    if (resourceUrl) {
      apiBaseUrl = `https://${resourceUrl}/v1`;
      logger.info('使用 resource_url 构造 API 端点', { apiBaseUrl });
    } else {
      apiBaseUrl = 'https://portal.qwen.ai/v1';
      logger.info('使用默认 API 端点', { apiBaseUrl });
    }
    
    const response = await axios.get(
      `${apiBaseUrl}/models`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'google-api-nodejs-client/9.15.1',
          'X-Goog-Api-Client': 'gl-node/22.17.0',
          'Client-Metadata': 'ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI',
          'Accept': 'application/json'
        }
      }
    );
    
    logger.info('成功获取模型列表', { count: response.data.data?.length || 0 });
    return response.data;
  } catch (error) {
    logger.error('获取模型列表失败', {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw new Error(error.response?.data?.error?.message || error.message);
  }
}

/**
 * 调用 Qwen API（OpenAI 兼容格式）
 * 基于 CLIProxyAPI 的实现
 * 
 * @param {string} accessToken - OAuth access token
 * @param {Array} messages - 消息列表（支持多模态：文本 + 图片）
 * @param {string} model - 模型名称（默认 qwen3-coder-flash，支持 vision）
 * @param {string} resourceUrl - 从 token 响应中获取的 resource_url（可选）
 */
async function chatCompletion(accessToken, messages, model = 'qwen3-coder-flash', resourceUrl = null) {
  try {
    logger.info('开始调用 Qwen API', { model, messageCount: messages.length, hasResourceUrl: !!resourceUrl });
    
    // 根据 CLIProxyAPI 的实现，使用 resource_url 构造 baseURL
    // 如果没有 resource_url，使用默认的 portal.qwen.ai
    let apiBaseUrl;
    if (resourceUrl) {
      apiBaseUrl = `https://${resourceUrl}/v1`;
      logger.info('使用 resource_url 构造 API 端点', { apiBaseUrl });
    } else {
      apiBaseUrl = 'https://portal.qwen.ai/v1';
      logger.info('使用默认 API 端点', { apiBaseUrl });
    }
    
    const response = await axios.post(
      `${apiBaseUrl}/chat/completions`,
      {
        model: model,
        messages: messages,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'google-api-nodejs-client/9.15.1',
          'X-Goog-Api-Client': 'gl-node/22.17.0',
          'Client-Metadata': 'ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI',
          'Accept': 'application/json'
        }
      }
    );
    
    logger.info('Qwen API 调用成功');
    return response.data;
  } catch (error) {
    logger.error('Qwen API 调用失败', {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw new Error(error.response?.data?.error?.message || error.message);
  }
}

/**
 * 调用 Qwen API（流式响应）
 * 
 * @param {string} accessToken - OAuth access token
 * @param {Array} messages - 消息列表（支持多模态：文本 + 图片）
 * @param {string} model - 模型名称（默认 qwen3-coder-flash，支持 vision）
 * @param {string} resourceUrl - 从 token 响应中获取的 resource_url（可选）
 * @returns {Promise<Stream>} - 返回流对象
 */
async function chatCompletionStream(accessToken, messages, model = 'qwen3-coder-flash', resourceUrl = null) {
  logger.info('开始调用 Qwen API（流式）', { 
    model, 
    messageCount: messages.length, 
    hasResourceUrl: !!resourceUrl 
  });
  
  // 详细日志：检查消息内容
  messages.forEach((msg, index) => {
    if (Array.isArray(msg.content)) {
      logger.info(`消息 ${index} 内容类型`, {
        role: msg.role,
        contentParts: msg.content.length,
        types: msg.content.map(part => part.type),
        hasImages: msg.content.some(part => part.type === 'image_url'),
        imageUrlPrefixes: msg.content
          .filter(part => part.type === 'image_url')
          .map(part => part.image_url?.url?.substring(0, 50))
      });
    } else {
      logger.info(`消息 ${index} 内容类型`, {
        role: msg.role,
        contentType: typeof msg.content,
        contentLength: msg.content?.length || 0
      });
    }
  });
  
  let apiBaseUrl;
  if (resourceUrl) {
    apiBaseUrl = `https://${resourceUrl}/v1`;
  } else {
    apiBaseUrl = 'https://portal.qwen.ai/v1';
  }
  
  const requestBody = {
    model: model,
    messages: messages,
    stream: true
  };
  
  // 记录请求体大小
  const requestBodySize = JSON.stringify(requestBody).length;
  logger.info('请求体信息', {
    size: requestBodySize,
    sizeKB: (requestBodySize / 1024).toFixed(2),
    endpoint: `${apiBaseUrl}/chat/completions`
  });
  
  const response = await axios.post(
    `${apiBaseUrl}/chat/completions`,
    requestBody,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'google-api-nodejs-client/9.15.1',
        'X-Goog-Api-Client': 'gl-node/22.17.0',
        'Client-Metadata': 'ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI',
        'Accept': 'text/event-stream'
      },
      responseType: 'stream'
    }
  );
  
  return response.data;
}

module.exports = {
  startDeviceFlow,
  pollForToken,
  refreshToken,
  listModels,
  chatCompletion,
  chatCompletionStream,
  QWEN_CONFIG
};
