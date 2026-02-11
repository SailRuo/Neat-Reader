/**
 * 测试所有可能的配置组合
 * 找出哪个配置支持图像上传
 */

const axios = require('axios');

// 1x1 红色像素的 PNG
const RED_PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const ACCESS_TOKEN = process.env.QWEN_ACCESS_TOKEN || 'EOavL7XFW3uQ10RBv3NIMfWicgZV3FzePkuuPQQTY-yCsD--Zgf1qcNa_74YPo2c8cj_lqf6BF3-dHQmoTxLaw';

// 测试配置
const CONFIGS = [
  {
    name: 'Portal + qwen3-coder-plus',
    baseUrl: 'https://portal.qwen.ai/v1',
    model: 'qwen3-coder-plus'
  },
  {
    name: 'Portal + qwen-vl-max',
    baseUrl: 'https://portal.qwen.ai/v1',
    model: 'qwen-vl-max'
  },
  {
    name: 'DashScope + qwen3-coder-plus',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3-coder-plus'
  },
  {
    name: 'DashScope + qwen-vl-max',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-vl-max'
  },
  {
    name: 'DashScope + qwen2.5-vl-72b-instruct',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen2.5-vl-72b-instruct'
  }
];

async function testConfig(config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 测试: ${config.name}`);
  console.log(`   端点: ${config.baseUrl}`);
  console.log(`   模型: ${config.model}`);
  console.log('='.repeat(60));
  
  try {
    const response = await axios.post(
      `${config.baseUrl}/chat/completions`,
      {
        model: config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: RED_PIXEL_PNG
                }
              },
              {
                type: 'text',
                text: '这张图片是什么颜色？请只回答颜色名称。'
              }
            ]
          }
        ],
        stream: false,
        max_tokens: 50
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const aiResponse = response.data.choices[0].message.content;
    console.log('✅ 成功！');
    console.log('📝 AI 回复:', aiResponse);
    
    // 更准确的检查：AI 是否真的识别了颜色
    const mentionsRed = /红色|red/i.test(aiResponse);
    const mentionsCannotSee = /无法看到|看不到|cannot see|can't see|没有.*图片/i.test(aiResponse);
    
    if (mentionsRed && !mentionsCannotSee) {
      console.log('🎉 AI 正确识别了图片内容！（真的看到了红色）');
      console.log('');
      console.log('✨ 推荐配置：');
      console.log(`   端点: ${config.baseUrl}`);
      console.log(`   模型: ${config.model}`);
      return true;
    } else if (mentionsCannotSee) {
      console.log('❌ AI 明确表示看不到图片');
      return false;
    } else {
      console.log('⚠️  AI 回复模糊，无法确定是否看到图片');
      return false;
    }
    
  } catch (error) {
    console.log('❌ 失败');
    console.log('错误:', error.response?.data?.error || error.message);
    
    if (error.response?.status === 400) {
      console.log('💡 可能原因: 模型不支持图像或端点不支持多模态');
    } else if (error.response?.status === 401) {
      console.log('💡 可能原因: Token 无效或没有权限');
    } else if (error.response?.status === 404) {
      console.log('💡 可能原因: 模型不存在');
    }
    
    return false;
  }
}

async function testAllConfigs() {
  console.log('🎯 测试所有配置组合');
  console.log('目标：找出支持图像上传的配置\n');
  
  if (!ACCESS_TOKEN) {
    console.error('❌ 请设置 QWEN_ACCESS_TOKEN 环境变量');
    console.log('');
    console.log('使用方法：');
    console.log('  export QWEN_ACCESS_TOKEN="your_token"');
    console.log('  node test-all-configs.js');
    process.exit(1);
  }
  
  console.log('✅ Token 已设置');
  console.log('📏 测试图片大小:', RED_PIXEL_PNG.length, 'bytes');
  console.log('');
  
  const results = [];
  
  for (const config of CONFIGS) {
    const success = await testConfig(config);
    results.push({ config: config.name, success });
    
    // 等待一下，避免请求太快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    console.log(`${status} - ${result.config}`);
  });
  
  const successConfigs = results.filter(r => r.success);
  
  if (successConfigs.length > 0) {
    console.log('\n🎉 找到可用配置！');
    console.log('');
    console.log('推荐使用：');
    successConfigs.forEach(result => {
      console.log(`  - ${result.config}`);
    });
  } else {
    console.log('\n😞 没有找到可用配置');
    console.log('');
    console.log('可能的原因：');
    console.log('  1. Token 没有 vision 模型权限');
    console.log('  2. 所有测试的模型都不支持图像');
    console.log('  3. API 端点配置问题');
    console.log('');
    console.log('建议：');
    console.log('  1. 检查 Token 权限');
    console.log('  2. 联系 Qwen 支持确认可用的 vision 模型');
    console.log('  3. 尝试使用 API Key 而不是 OAuth Token');
  }
}

testAllConfigs().catch(console.error);
