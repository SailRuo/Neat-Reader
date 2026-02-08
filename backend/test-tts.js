// TTS 功能测试脚本
const { EdgeTTS } = require('node-edge-tts');
const path = require('path');
const fs = require('fs');

async function testEdgeTTS() {
    console.log('🧪 开始测试 Edge TTS...\n');

    try {
        // 1. 测试基本合成
        console.log('1️⃣ 测试基本语音合成...');
        const testText = '你好，这是一个测试。';
        const outputPath = path.join(__dirname, 'test-output.mp3');
        
        console.log(`   文本: "${testText}"`);
        console.log(`   输出: ${outputPath}`);
        
        const tts = new EdgeTTS({
            voice: 'zh-CN-XiaoxiaoNeural',
            lang: 'zh-CN'
        });
        
        await tts.ttsPromise(testText, outputPath);
        
        // 检查文件是否生成
        const stats = fs.statSync(outputPath);
        console.log(`✅ 合成成功！音频大小: ${stats.size} bytes\n`);
        
        // 清理测试文件
        fs.unlinkSync(outputPath);

        // 2. 测试不同参数
        console.log('2️⃣ 测试语速和音调调节...');
        const tts2 = new EdgeTTS({
            voice: 'zh-CN-YunxiNeural',
            lang: 'zh-CN',
            rate: '+20%',
            pitch: '+10%'
        });
        
        const outputPath2 = path.join(__dirname, 'test-output2.mp3');
        await tts2.ttsPromise('这是一个快速高音的测试。', outputPath2);
        
        const stats2 = fs.statSync(outputPath2);
        console.log(`✅ 参数调节成功！音频大小: ${stats2.size} bytes\n`);
        
        // 清理测试文件
        fs.unlinkSync(outputPath2);

        console.log('🎉 所有测试通过！\n');
        console.log('📝 可用的推荐中文语音：');
        const recommended = [
            'zh-CN-XiaoxiaoNeural - 晓晓 (女声，温柔)',
            'zh-CN-YunxiNeural - 云希 (男声，沉稳)',
            'zh-CN-YunyangNeural - 云扬 (男声，专业)',
            'zh-CN-XiaoyiNeural - 晓伊 (女声，甜美)',
            'zh-CN-YunjianNeural - 云健 (男声，活力)',
            'zh-CN-XiaochenNeural - 晓辰 (女声，知性)'
        ];
        recommended.forEach(v => console.log(`  • ${v}`));

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// 运行测试
testEdgeTTS();
