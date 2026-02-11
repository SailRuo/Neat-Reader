/**
 * 测试文件处理功能（类似 Qwen Code 的 @relativePath）
 * 
 * 使用方法：
 * 1. 确保后端服务正在运行（npm run dev）
 * 2. 设置环境变量 QWEN_ACCESS_TOKEN 和 QWEN_RESOURCE_URL
 * 3. 运行：node test-file-processor.js
 */

const axios = require('axios');
const path = require('path');

// 配置
const API_BASE = 'http://localhost:3001/api/qwen';
const ACCESS_TOKEN = process.env.QWEN_ACCESS_TOKEN || '';
const RESOURCE_URL = process.env.QWEN_RESOURCE_URL || '';

async function testFileProcessor() {
  console.log('🧪 开始测试文件处理功能（类似 Qwen Code @relativePath）\n');
  
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
  
  // 测试 1：处理单个文本文件
  console.log('📝 测试 1：处理单个文本文件');
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    
    const response1 = await axios.post(`${API_BASE}/chat-with-files`, {
      access_token: ACCESS_TOKEN,
      message: '请总结这个 package.json 文件的主要内容',
      file_paths: [packageJsonPath],
      resource_url: RESOURCE_URL
    });
    
    console.log('✅ 成功！');
    console.log('   模型:', response1.data.model);
    console.log('   处理文件数:', response1.data.files_processed.success);
    console.log('   响应:', response1.data.response.substring(0, 100) + '...');
    console.log('   Token 使用:', response1.data.usage);
    console.log('');
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
    console.log('');
  }
  
  // 测试 2：处理多个文件（文本 + 图像）
  console.log('📁 测试 2：处理多个文件');
  try {
    const filePaths = [
      path.join(__dirname, 'package.json'),
      path.join(__dirname, '../README.md')
    ];
    
    const response2 = await axios.post(`${API_BASE}/chat-with-files`, {
      access_token: ACCESS_TOKEN,
      message: '请分析这些文件，告诉我这个项目的主要功能',
      file_paths: filePaths,
      resource_url: RESOURCE_URL
    });
    
    console.log('✅ 成功！');
    console.log('   模型:', response2.data.model);
    console.log('   处理文件数:', response2.data.files_processed.success);
    console.log('   响应:', response2.data.response.substring(0, 150) + '...');
    console.log('   Token 使用:', response2.data.usage);
    console.log('');
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
    console.log('');
  }
  
  // 测试 3：流式响应
  console.log('🌊 测试 3：流式响应');
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    
    const response3 = await axios.post(
      `${API_BASE}/chat-with-files-stream`,
      {
        access_token: ACCESS_TOKEN,
        message: '请用一句话总结这个项目',
        file_paths: [packageJsonPath],
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
  console.log('\n💡 使用提示：');
  console.log('   - 支持文本文件：.txt, .md, .json, .js, .ts, .vue 等');
  console.log('   - 支持图像文件：.jpg, .png, .gif, .webp 等');
  console.log('   - 支持 PDF 文件：.pdf');
  console.log('   - 自动检测文件类型并编码');
  console.log('   - 类似 Qwen Code 的 @relativePath 功能');
}

// 运行测试
testFileProcessor().catch(console.error);
