/**
 * Qwen API 端点探测脚本
 * 用于查找真实的 Device Code Flow API 端点
 */

const axios = require('axios');

// 可能的 API 端点
const POSSIBLE_ENDPOINTS = [
  // Device Code 端点
  'https://chat.qwen.ai/api/oauth/device/code',
  'https://chat.qwen.ai/api/oauth/device',
  'https://chat.qwen.ai/oauth/device/code',
  'https://dashscope.aliyuncs.com/api/oauth/device/code',
  'https://api.qwen.ai/oauth/device/code',
  
  // Token 端点
  'https://chat.qwen.ai/api/oauth/token',
  'https://chat.qwen.ai/oauth/token',
  'https://dashscope.aliyuncs.com/api/oauth/token',
  'https://api.qwen.ai/oauth/token'
];

async function testEndpoint(url, method = 'POST', data = null) {
  try {
    console.log(`\n测试: ${method} ${url}`);
    
    const config = {
      method,
      url,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Neat-Reader/1.0'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    console.log('✅ 成功!');
    console.log('状态码:', response.status);
    console.log('响应:', JSON.stringify(response.data, null, 2));
    
    return { success: true, url, response: response.data };
  } catch (error) {
    if (error.response) {
      console.log(`❌ 失败 (${error.response.status})`);
      console.log('错误:', error.response.data);
      return { success: false, url, status: error.response.status, error: error.response.data };
    } else {
      console.log('❌ 网络错误:', error.message);
      return { success: false, url, error: error.message };
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Qwen API 端点探测');
  console.log('='.repeat(60));
  
  const results = [];
  
  // 测试 Device Code 端点
  console.log('\n\n📍 测试 Device Code 端点...\n');
  
  for (const url of POSSIBLE_ENDPOINTS.filter(u => u.includes('device'))) {
    const result = await testEndpoint(url, 'POST', {
      client_id: 'qwen-code',
      scope: 'openid profile'
    });
    results.push(result);
    
    // 等待一下避免请求太快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 测试 Token 端点
  console.log('\n\n📍 测试 Token 端点...\n');
  
  for (const url of POSSIBLE_ENDPOINTS.filter(u => u.includes('token'))) {
    const result = await testEndpoint(url, 'POST', {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: 'test_device_code',
      client_id: 'qwen-code'
    });
    results.push(result);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 总结
  console.log('\n\n' + '='.repeat(60));
  console.log('测试总结');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ 成功: ${successful.length}`);
  console.log(`❌ 失败: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n成功的端点:');
    successful.forEach(r => {
      console.log(`  - ${r.url}`);
    });
  }
  
  // 分析失败原因
  console.log('\n失败原因分析:');
  const statusCodes = {};
  failed.forEach(r => {
    const status = r.status || 'network_error';
    statusCodes[status] = (statusCodes[status] || 0) + 1;
  });
  
  Object.entries(statusCodes).forEach(([status, count]) => {
    console.log(`  - ${status}: ${count} 次`);
  });
  
  console.log('\n💡 建议:');
  console.log('  1. 如果所有端点都失败，可能需要特殊的认证方式');
  console.log('  2. 可以尝试抓包 CLIProxyAPI 来获取真实端点');
  console.log('  3. 或者使用 Qwen API Key 模式（无需 OAuth）');
  console.log('\n获取 API Key: https://dashscope.console.aliyun.com/');
}

main().catch(console.error);
