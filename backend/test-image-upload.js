/**
 * 测试图像上传功能
 * 
 * 使用方法：
 * 1. 确保后端服务正在运行（npm run dev）
 * 2. 设置环境变量 QWEN_ACCESS_TOKEN 和 QWEN_RESOURCE_URL
 * 3. 运行：node test-image-upload.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const API_BASE = 'http://localhost:3001/api/qwen';
const ACCESS_TOKEN = process.env.QWEN_ACCESS_TOKEN || '';
const RESOURCE_URL = process.env.QWEN_RESOURCE_URL || '';

// 测试图片（1x1 红色像素的 PNG）
const TEST_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

async function testImageUpload() {
  console.log('🧪 开始测试图像上传功能\n');
  
  // 检查 token
  if (!ACCESS_TOKEN) {
    console.error('❌ 错误：未设置 QWEN_ACCESS_TOKEN 环境变量');
    console.log('请先运行：');
    console.log('  export QWEN_ACCESS_TOKEN="your_token"');
    console.log('  export QWEN_RESOURCE_URL="portal.qwen.ai"');
    process.exit(1);
  }
  
  console.log('✅ Token 已设置');
  console.log('✅ Resource URL:', RESOURCE_URL || '(使用默认)');
  console.log('');
  
  // 测试 1：纯文本消息
  console.log('📝 测试 1：纯文本消息');
  try {
    const response1 = await axios.post(`${API_BASE}/test`, {
      access_token: ACCESS_TOKEN,
      message: '你好，请用一句话介绍你自己。',
      resource_url: RESOURCE_URL
    });
    
    console.log('✅ 成功！');
    console.log('   模型:', response1.data.model);
    console.log('   响应:', response1.data.response.substring(0, 50) + '...');
    console.log('   Token 使用:', response1.data.usage);
    console.log('');
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
    console.log('');
  }
  
  // 测试 2：图片 + 文本消息
  console.log('🖼️  测试 2：图片 + 文本消息');
  try {
    const response2 = await axios.post(`${API_BASE}/test`, {
      access_token: ACCESS_TOKEN,
      message: '这张图片是什么颜色？',
      images: [TEST_IMAGE_BASE64],
      resource_url: RESOURCE_URL
    });
    
    console.log('✅ 成功！');
    console.log('   模型:', response2.data.model);
    console.log('   响应:', response2.data.response);
    console.log('   Token 使用:', response2.data.usage);
    console.log('');
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
    console.log('');
  }
  
  // 测试 3：流式响应
  console.log('🌊 测试 3：流式响应（图片 + 文本）');
  try {
    const response3 = await axios.post(
      `${API_BASE}/chat-stream`,
      {
        access_token: ACCESS_TOKEN,
        message: '请描述这张图片的颜色。',
        images: [TEST_IMAGE_BASE64],
        resource_url: RESOURCE_URL
      },
      {
        responseType: 'stream'
      }
    );
    
    console.log('✅ 流式连接成功！');
    console.log('   接收数据中...\n');
    
    let fullResponse = '';
    
    response3.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            console.log('\n✅ 流式响应完成！');
            console.log('   完整响应:', fullResponse);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              process.stdout.write(parsed.content);
              fullResponse += parsed.content;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    });
    
    response3.data.on('end', () => {
      console.log('\n');
    });
    
    response3.data.on('error', (error) => {
      console.error('❌ 流式响应错误:', error.message);
    });
    
    // 等待流完成
    await new Promise((resolve) => {
      response3.data.on('end', resolve);
    });
    
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
    console.log('');
  }
  
  console.log('\n🎉 测试完成！');
}

// 运行测试
testImageUpload().catch(console.error);
