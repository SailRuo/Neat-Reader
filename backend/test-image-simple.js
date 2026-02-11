/**
 * 简单的图像上传测试
 * 使用一个 1x1 像素的红色图片
 */

const axios = require('axios');

// 1x1 红色像素的 PNG（Base64）
const RED_PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const API_BASE = 'http://localhost:3001/api/qwen';
const ACCESS_TOKEN = process.env.QWEN_ACCESS_TOKEN || '';
const RESOURCE_URL = process.env.QWEN_RESOURCE_URL || '';

async function testSimpleImage() {
  console.log('🧪 测试简单图像上传\n');
  
  if (!ACCESS_TOKEN) {
    console.error('❌ 请设置 QWEN_ACCESS_TOKEN 环境变量');
    process.exit(1);
  }
  
  console.log('✅ Token 已设置');
  console.log('📏 图片大小:', RED_PIXEL_PNG.length, 'bytes');
  console.log('🎨 图片前缀:', RED_PIXEL_PNG.substring(0, 50));
  console.log('');
  
  try {
    console.log('📤 发送请求...');
    
    const response = await axios.post(
      `${API_BASE}/chat-stream`,
      {
        access_token: ACCESS_TOKEN,
        message: '这张图片是什么颜色？请只回答颜色名称。',
        images: [RED_PIXEL_PNG],
        resource_url: RESOURCE_URL
      },
      {
        responseType: 'stream'
      }
    );
    
    console.log('✅ 连接成功！');
    console.log('📥 接收响应...\n');
    
    let fullResponse = '';
    
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            console.log('\n\n✅ 响应完成！');
            console.log('📝 完整响应:', fullResponse);
            
            // 检查响应是否包含颜色相关的词
            const hasColorMention = /红|red|颜色|color|像素|pixel/i.test(fullResponse);
            if (hasColorMention) {
              console.log('✅ AI 识别到了图片内容！');
            } else {
              console.log('⚠️  AI 可能没有正确识别图片');
            }
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              process.stdout.write(parsed.content);
              fullResponse += parsed.content;
            }
            if (parsed.error) {
              console.error('\n❌ 错误:', parsed.error);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    });
    
    response.data.on('error', (error) => {
      console.error('\n❌ 流错误:', error.message);
    });
    
    // 等待流完成
    await new Promise((resolve, reject) => {
      response.data.on('end', resolve);
      response.data.on('error', reject);
    });
    
  } catch (error) {
    console.error('\n❌ 请求失败:');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n💡 可能的原因：');
      console.log('   1. 图片格式不正确');
      console.log('   2. 模型不支持图像');
      console.log('   3. API 端点不支持多模态');
    }
  }
}

console.log('🎯 简单图像上传测试');
console.log('=' .repeat(50));
console.log('');

testSimpleImage().catch(console.error);
