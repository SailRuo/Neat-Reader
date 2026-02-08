/**
 * 测试真实的 Qwen OAuth Device Code Flow
 * 基于 CLIProxyAPI 的实现
 */

const qwenService = require('./src/services/qwenService');

async function testDeviceFlow() {
  console.log('='.repeat(60));
  console.log('测试 Qwen Device Code Flow');
  console.log('='.repeat(60));
  
  try {
    // 1. 启动 Device Code Flow
    console.log('\n📍 步骤 1: 启动 Device Code Flow\n');
    const deviceFlow = await qwenService.startDeviceFlow();
    
    console.log('✅ Device Code Flow 启动成功!');
    console.log('\n返回数据:');
    console.log('  - User Code:', deviceFlow.user_code);
    console.log('  - Device Code:', deviceFlow.device_code.substring(0, 20) + '...');
    console.log('  - Code Verifier:', deviceFlow.code_verifier.substring(0, 20) + '...');
    console.log('  - Verification URI:', deviceFlow.verification_uri);
    console.log('  - Auth URL:', deviceFlow.auth_url);
    console.log('  - Expires In:', deviceFlow.expires_in, '秒');
    console.log('  - Interval:', deviceFlow.interval, '秒');
    
    // 2. 打开授权页面
    console.log('\n📍 步骤 2: 打开授权页面\n');
    console.log('请在浏览器中打开以下 URL 并输入用户码:');
    console.log('\n  ' + deviceFlow.auth_url);
    console.log('\n  用户码: ' + deviceFlow.user_code);
    
    // 3. 轮询 token
    console.log('\n📍 步骤 3: 轮询 token（最多 60 次，每 5 秒一次）\n');
    
    const maxAttempts = 60;
    let pollInterval = deviceFlow.interval * 1000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`轮询尝试 ${attempt}/${maxAttempts}...`);
      
      try {
        const result = await qwenService.pollForToken(
          deviceFlow.device_code,
          deviceFlow.code_verifier
        );
        
        if (result.pending) {
          if (result.slow_down) {
            pollInterval = Math.min(pollInterval * 1.5, 10000);
            console.log(`  ⚠️  服务器要求减速，增加间隔到 ${pollInterval / 1000} 秒`);
          } else {
            console.log('  ⏳ 等待用户授权...');
          }
          
          // 等待后继续轮询
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        
        // 成功获取 token
        console.log('\n✅ 成功获取 token!\n');
        console.log('Token 信息:');
        console.log('  - Access Token:', result.access_token.substring(0, 30) + '...');
        console.log('  - Refresh Token:', result.refresh_token?.substring(0, 30) + '...');
        console.log('  - Token Type:', result.token_type);
        console.log('  - Expires In:', result.expires_in, '秒');
        if (result.resource_url) {
          console.log('  - Resource URL:', result.resource_url);
        }
        
        // 4. 测试 API 调用
        console.log('\n📍 步骤 4: 测试 Qwen API\n');
        
        const apiResult = await qwenService.chatCompletion(
          result.access_token,
          [{ role: 'user', content: '你好，请用一句话介绍你自己。' }],
          'qwen-plus'
        );
        
        console.log('✅ API 调用成功!\n');
        console.log('响应内容:', apiResult.choices[0].message.content);
        console.log('\nToken 使用统计:');
        console.log('  - Prompt Tokens:', apiResult.usage.prompt_tokens);
        console.log('  - Completion Tokens:', apiResult.usage.completion_tokens);
        console.log('  - Total Tokens:', apiResult.usage.total_tokens);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 所有测试通过!');
        console.log('='.repeat(60));
        
        return;
      } catch (error) {
        if (error.message.includes('授权超时') || error.message.includes('用户拒绝')) {
          console.error('\n❌ 授权失败:', error.message);
          return;
        }
        throw error;
      }
    }
    
    console.error('\n❌ 轮询超时，请重新开始授权流程');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n详细错误:');
    console.error(error);
    
    console.log('\n💡 可能的原因:');
    console.log('  1. 网络连接问题');
    console.log('  2. API 端点不正确');
    console.log('  3. Client ID 无效');
    console.log('  4. PKCE 参数生成错误');
    
    process.exit(1);
  }
}

// 运行测试
testDeviceFlow().catch(console.error);
