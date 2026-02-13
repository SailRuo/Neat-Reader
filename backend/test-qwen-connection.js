/**
 * 测试 Qwen 服务连接
 * 运行: node backend/test-qwen-connection.js
 */

const axios = require('axios');

async function testQwenConnection() {
  console.log('=== 测试 Qwen 服务连接 ===\n');
  
  // 测试 1: 访问主页
  console.log('1. 测试访问 https://chat.qwen.ai/');
  try {
    const response = await axios.get('https://chat.qwen.ai/', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log('✅ 主页可访问');
    console.log(`   状态码: ${response.status}`);
  } catch (error) {
    console.log('❌ 主页访问失败');
    console.log(`   错误: ${error.message}`);
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
    }
    if (error.code) {
      console.log(`   错误代码: ${error.code}`);
    }
  }
  
  console.log('\n2. 测试 Device Code API');
  try {
    const params = new URLSearchParams({
      client_id: 'f0304373b74a44d2b584a3fb70ca9e56',
      scope: 'openid profile email model.completion',
      code_challenge: 'test_challenge',
      code_challenge_method: 'S256'
    });
    
    const response = await axios.post(
      'https://chat.qwen.ai/api/v1/oauth2/device/code',
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
    console.log('✅ Device Code API 可访问');
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error) {
    console.log('❌ Device Code API 访问失败');
    console.log(`   错误: ${error.message}`);
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   响应: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    if (error.code) {
      console.log(`   错误代码: ${error.code}`);
    }
  }
  
  console.log('\n=== 测试完成 ===');
  console.log('\n建议:');
  console.log('- 如果显示 ENOTFOUND 或 ECONNREFUSED: 检查网络连接');
  console.log('- 如果显示 502/503: Qwen 服务暂时不可用，请稍后重试');
  console.log('- 如果显示 ETIMEDOUT: 可能需要使用代理访问');
  console.log('- 如果在中国大陆，可能需要配置代理才能访问');
}

testQwenConnection().catch(console.error);
