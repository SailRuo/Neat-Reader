const { EdgeTTS } = require('node-edge-tts');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

class TTSService {
    constructor() {
        this.cacheDir = path.join(__dirname, '../../cache/tts');
        this.initCache();
        
        // 预定义的中文语音列表（从微软 Azure 文档获取）
        // 参考：https://learn.microsoft.com/zh-cn/azure/ai-services/speech-service/language-support
        this.chineseVoices = [
            // 普通话（中国大陆）- 女声
            { ShortName: 'zh-CN-XiaoxiaoNeural', FriendlyName: '晓晓 (女声，温柔自然)', Locale: 'zh-CN', Gender: 'Female', Description: '通用场景，温柔亲切' },
            { ShortName: 'zh-CN-XiaoyiNeural', FriendlyName: '晓伊 (女声，甜美活泼)', Locale: 'zh-CN', Gender: 'Female', Description: '年轻女性，甜美可爱' },
            { ShortName: 'zh-CN-XiaochenNeural', FriendlyName: '晓辰 (女声，知性优雅)', Locale: 'zh-CN', Gender: 'Female', Description: '成熟女性，知性大方' },
            { ShortName: 'zh-CN-XiaohanNeural', FriendlyName: '晓涵 (女声，亲切温暖)', Locale: 'zh-CN', Gender: 'Female', Description: '亲切温暖，适合客服' },
            { ShortName: 'zh-CN-XiaomoNeural', FriendlyName: '晓墨 (女声，沉稳专业)', Locale: 'zh-CN', Gender: 'Female', Description: '新闻播报，专业沉稳' },
            { ShortName: 'zh-CN-XiaoqiuNeural', FriendlyName: '晓秋 (女声，成熟稳重)', Locale: 'zh-CN', Gender: 'Female', Description: '成熟女性，稳重大气' },
            { ShortName: 'zh-CN-XiaoxuanNeural', FriendlyName: '晓萱 (女声，优雅柔美)', Locale: 'zh-CN', Gender: 'Female', Description: '优雅柔美，适合朗读' },
            { ShortName: 'zh-CN-XiaoyanNeural', FriendlyName: '晓颜 (女声，柔和舒缓)', Locale: 'zh-CN', Gender: 'Female', Description: '柔和舒缓，适合有声书' },
            { ShortName: 'zh-CN-XiaoyouNeural', FriendlyName: '晓悠 (女声，童声可爱)', Locale: 'zh-CN', Gender: 'Female', Description: '儿童声音，活泼可爱' },
            { ShortName: 'zh-CN-XiaozhenNeural', FriendlyName: '晓甄 (女声，温婉动听)', Locale: 'zh-CN', Gender: 'Female', Description: '温婉动听，适合故事' },
            { ShortName: 'zh-CN-XiaoruiNeural', FriendlyName: '晓睿 (女声，清新明快)', Locale: 'zh-CN', Gender: 'Female', Description: '清新明快，年轻活力' },
            { ShortName: 'zh-CN-XiaoshuangNeural', FriendlyName: '晓双 (女声，童声)', Locale: 'zh-CN', Gender: 'Female', Description: '儿童声音，天真烂漫' },
            
            // 普通话（中国大陆）- 男声
            { ShortName: 'zh-CN-YunxiNeural', FriendlyName: '云希 (男声，沉稳大气)', Locale: 'zh-CN', Gender: 'Male', Description: '通用场景，沉稳大气' },
            { ShortName: 'zh-CN-YunyangNeural', FriendlyName: '云扬 (男声，专业播音)', Locale: 'zh-CN', Gender: 'Male', Description: '新闻播报，专业标准' },
            { ShortName: 'zh-CN-YunjianNeural', FriendlyName: '云健 (男声，活力阳光)', Locale: 'zh-CN', Gender: 'Male', Description: '年轻男性，充满活力' },
            { ShortName: 'zh-CN-YunfengNeural', FriendlyName: '云枫 (男声，成熟稳重)', Locale: 'zh-CN', Gender: 'Male', Description: '成熟男性，稳重可靠' },
            { ShortName: 'zh-CN-YunhaoNeural', FriendlyName: '云皓 (男声，广告配音)', Locale: 'zh-CN', Gender: 'Male', Description: '广告配音，磁性动听' },
            { ShortName: 'zh-CN-YunyeNeural', FriendlyName: '云野 (男声，专业解说)', Locale: 'zh-CN', Gender: 'Male', Description: '专业解说，清晰有力' },
            { ShortName: 'zh-CN-YunzeNeural', FriendlyName: '云泽 (男声，年轻清新)', Locale: 'zh-CN', Gender: 'Male', Description: '年轻男性，清新自然' },
            
            // 多语言支持
            { ShortName: 'zh-CN-XiaoxiaoMultilingualNeural', FriendlyName: '晓晓多语言 (女声)', Locale: 'zh-CN', Gender: 'Female', Description: '支持多语言切换' },
            { ShortName: 'zh-CN-YunxiMultilingualNeural', FriendlyName: '云希多语言 (男声)', Locale: 'zh-CN', Gender: 'Male', Description: '支持多语言切换' },
            
            // 方言
            { ShortName: 'zh-CN-liaoning-XiaobeiNeural', FriendlyName: '晓北 (女声，东北话)', Locale: 'zh-CN-liaoning', Gender: 'Female', Description: '东北方言' },
            { ShortName: 'zh-CN-shaanxi-XiaoniNeural', FriendlyName: '晓妮 (女声，陕西话)', Locale: 'zh-CN-shaanxi', Gender: 'Female', Description: '陕西方言' },
            
            // 粤语
            { ShortName: 'zh-HK-HiuMaanNeural', FriendlyName: '曉曼 (女声，粤语)', Locale: 'zh-HK', Gender: 'Female', Description: '香港粤语，女声' },
            { ShortName: 'zh-HK-HiuGaaiNeural', FriendlyName: '曉佳 (女声，粤语)', Locale: 'zh-HK', Gender: 'Female', Description: '香港粤语，女声' },
            { ShortName: 'zh-HK-WanLungNeural', FriendlyName: '雲龍 (男声，粤语)', Locale: 'zh-HK', Gender: 'Male', Description: '香港粤语，男声' },
            
            // 台湾国语
            { ShortName: 'zh-TW-HsiaoChenNeural', FriendlyName: '曉臻 (女声，台湾)', Locale: 'zh-TW', Gender: 'Female', Description: '台湾国语，女声' },
            { ShortName: 'zh-TW-HsiaoYuNeural', FriendlyName: '曉雨 (女声，台湾)', Locale: 'zh-TW', Gender: 'Female', Description: '台湾国语，女声' },
            { ShortName: 'zh-TW-YunJheNeural', FriendlyName: '雲哲 (男声，台湾)', Locale: 'zh-TW', Gender: 'Male', Description: '台湾国语，男声' }
        ];
    }

    async initCache() {
        try {
            await mkdir(this.cacheDir, { recursive: true });
            console.log('✅ TTS 缓存目录已创建:', this.cacheDir);
        } catch (error) {
            console.error('❌ 创建 TTS 缓存目录失败:', error);
        }
    }

    /**
     * 获取可用的语音列表
     */
    async getVoices() {
        try {
            console.log(`🔊 返回 ${this.chineseVoices.length} 个中文语音`);
            
            return {
                all: this.chineseVoices,
                chinese: this.chineseVoices
            };
        } catch (error) {
            console.error('❌ 获取语音列表失败:', error);
            throw error;
        }
    }

    /**
     * 使用 Edge TTS 生成语音
     * @param {string} text - 要转换的文本
     * @param {object} options - 配置选项
     * @returns {Promise<Buffer>} 音频数据
     */
    async synthesizeEdge(text, options = {}) {
        const {
            voice = 'zh-CN-XiaoxiaoNeural',
            rate = 0,
            pitch = 0,
            volume = 0
        } = options;

        // 生成临时文件路径
        const tempFile = path.join(this.cacheDir, `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`);

        try {
            console.log(`🔊 Edge TTS 合成: "${text.substring(0, 50)}..." 使用语音: ${voice}`);

            // 转换参数格式
            const rateStr = rate === 0 ? 'default' : (rate >= 0 ? `+${rate}%` : `${rate}%`);
            const pitchStr = pitch === 0 ? 'default' : (pitch >= 0 ? `+${pitch}%` : `${pitch}%`);
            const volumeStr = volume === 0 ? 'default' : (volume >= 0 ? `+${volume}%` : `${volume}%`);

            const tts = new EdgeTTS({
                voice: voice,
                lang: voice.startsWith('zh-') ? 'zh-CN' : 'en-US',
                rate: rateStr,
                pitch: pitchStr,
                volume: volumeStr
            });
            
            // 生成音频文件
            await tts.ttsPromise(text, tempFile);
            
            // 读取文件内容
            const audioData = await readFile(tempFile);
            
            // 删除临时文件
            await unlink(tempFile);
            
            console.log(`✅ Edge TTS 合成成功，音频大小: ${audioData.length} bytes`);
            return audioData;
        } catch (error) {
            console.error('❌ Edge TTS 合成失败:', error);
            // 清理临时文件
            try {
                await unlink(tempFile);
            } catch (e) {
                // 忽略删除错误
            }
            throw error;
        }
    }

    /**
     * 生成语音并保存到缓存
     * @param {string} text - 要转换的文本
     * @param {object} options - 配置选项
     * @returns {Promise<string>} 音频文件路径
     */
    async synthesizeAndCache(text, options = {}) {
        try {
            const audioData = await this.synthesizeEdge(text, options);
            
            // 生成缓存文件名
            const hash = require('crypto')
                .createHash('md5')
                .update(text + JSON.stringify(options))
                .digest('hex');
            
            const filename = `${hash}.mp3`;
            const filepath = path.join(this.cacheDir, filename);
            
            // 保存到缓存
            await fs.promises.writeFile(filepath, audioData);
            console.log(`💾 音频已缓存: ${filename}`);
            
            return filepath;
        } catch (error) {
            console.error('❌ 合成并缓存失败:', error);
            throw error;
        }
    }

    /**
     * 流式合成语音（用于长文本）
     * 注意：node-edge-tts 不支持真正的流式，这里使用分块合成模拟
     */
    async synthesizeStream(text, options = {}, onChunk) {
        try {
            console.log(`🔊 Edge TTS 流式合成: "${text.substring(0, 50)}..."`);
            
            // 直接合成整个文本
            const audioData = await this.synthesizeEdge(text, options);
            
            // 模拟分块发送
            if (onChunk) {
                const chunkSize = 4096;
                for (let i = 0; i < audioData.length; i += chunkSize) {
                    const chunk = audioData.slice(i, Math.min(i + chunkSize, audioData.length));
                    onChunk(chunk);
                }
            }
            
            console.log(`✅ 流式合成完成，总大小: ${audioData.length} bytes`);
            return audioData;
        } catch (error) {
            console.error('❌ 流式合成失败:', error);
            throw error;
        }
    }

    /**
     * 清理缓存
     */
    async clearCache() {
        try {
            const files = await fs.promises.readdir(this.cacheDir);
            let count = 0;
            for (const file of files) {
                // 只删除 mp3 文件，保留临时文件
                if (file.endsWith('.mp3') && !file.startsWith('temp_')) {
                    await fs.promises.unlink(path.join(this.cacheDir, file));
                    count++;
                }
            }
            console.log(`🗑️ 已清理 ${count} 个缓存文件`);
        } catch (error) {
            console.error('❌ 清理缓存失败:', error);
            throw error;
        }
    }
}

module.exports = new TTSService();
