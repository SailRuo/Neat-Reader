/**
 * Qwen OAuth 测试脚本
 * 
 * 使用方法：
 * node test-qwen.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/qwen';

async function testQwenOAuth() {
  console.log('=== Qwen OAuth 测试 ===\n');
  
  try {
    // 1. 测试生成授权 URL
    console.log('1. 测试生成授权 URL...');
    const authResponse = await axios.post(`${API_BASE}/auth-url`, {
      redirectUri: 'http://localhost:5173/#/qwen-callback'
    });
    
    console.log('✓ 授权 URL 生成成功');
    console.log('  - Auth URL:', authResponse.data.authUrl.substring(0, 80) + '...');
    console.log('  - State:', authResponse.data.state);
    console.log('');
    
    // 2. 说明手动授权步骤
    console.log('2. 手动授权步骤：');
    console.log('  a. 在浏览器中打开以下 URL：');
    console.log(`     ${authResponse.data.authUrl}`);
    console.log('  b. 登录 Qwen 账户并授权');
    console.log('  c. 从回调 URL 中复制 code 参数');
    console.log('  d. 运行以下命令测试换取 token：');
    console.log(`     node test-qwen.js exchange <code> ${authResponse.data.state}`);
    console.log('');
    
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
    if (error.response) {
      console.error('  响应数据:', error.response.data);
    }
  }
}

async function testExchangeToken(code, state) {
  console.log('=== 测试换取 Token ===\n');
  
  try {
    console.log('换取 token...');
    const tokenResponse = await axios.post(`${API_BASE}/token`, {
      code,
      state
    });
    
    console.log('✓ Token 换取成功');
    console.log('  - Access Token:', tokenResponse.data.access_token.substring(0, 20) + '...');
    console.log('  - Refresh Token:', tokenResponse.data.refresh_token.substring(0, 20) + '...');
    console.log('  - Expires In:', tokenResponse.data.expires_in, 'seconds');
    console.log('');
    
    // 3. 测试 API 调用
    console.log('测试 Qwen API...');
    const testResponse = await axios.post(`${API_BASE}/test`, {
      access_token: tokenResponse.data.access_token,
      message: '你好，请用一句话介绍你自己。'
    });
    
    console.log('✓ API 调用成功');
    console.log('  - 响应:', testResponse.data.response);
    console.log('  - Token 使用:', testResponse.data.usage);
    console.log('');
    
    // 保存 token 供后续测试使用
    console.log('Token 已保存，可用于后续测试');
    console.log(`  node test-qwen.js test ${tokenResponse.data.access_token}`);
    
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
    if (error.response) {
      console.error('  响应数据:', error.response.data);
    }
  }
}

async function testAPI(accessToken, message) {
  console.log('=== 测试 Qwen API ===\n');
  
  try {
    const testMessage = message || '你好，请用一句话介绍你自己。';
    console.log('发送消息:', testMessage);
    
    const response = await axios.post(`${API_BASE}/test`, {
      access_token: accessToken,
      message: testMessage
    });
    
    console.log('✓ API 调用成功');
    console.log('  - 响应:', response.data.response);
    console.log('  - Token 使用:', response.data.usage);
    
  } catch (error) {
    console.error('✗ 测试失败:', error.message);
    if (error.response) {
      console.error('  响应数据:', error.response.data);
    }
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const command = args[0];

if (command === 'exchange') {
  const code = args[1];
  const state = args[2];
  if (!code || !state) {
    console.error('用法: node test-qwen.js exchange <code> <state>');
    process.exit(1);
  }
  testExchangeToken(code, state);
} else if (command === 'test') {
  const accessToken = args[1];
  const message = args.slice(2).join(' ');
  if (!accessToken) {
    console.error('用法: node test-qwen.js test <access_token> [message]');
    process.exit(1);
  }
  testAPI(accessToken, message);
} else {
  testQwenOAuth();
}
