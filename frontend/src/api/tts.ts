import axios from 'axios'

const API_BASE = 'http://localhost:3001/api/tts'

export interface TTSVoice {
    Name: string
    ShortName: string
    Gender: string
    Locale: string
    SuggestedCodec: string
    FriendlyName: string
    Status: string
}

export interface TTSOptions {
    voice?: string
    rate?: number    // -50 到 50
    pitch?: number   // -50 到 50
    volume?: number  // -50 到 50
}

export interface VoicesResponse {
    all: TTSVoice[]
    chinese: TTSVoice[]
}

/**
 * 获取可用语音列表
 */
export async function getVoices(): Promise<VoicesResponse> {
    try {
        const response = await axios.get(`${API_BASE}/voices`)
        return response.data.data
    } catch (error) {
        console.error('获取语音列表失败:', error)
        throw error
    }
}

/**
 * 合成语音
 * @param text 要转换的文本
 * @param options TTS 选项
 * @returns 音频 Blob
 */
export async function synthesize(text: string, options: TTSOptions = {}): Promise<Blob> {
    try {
        const response = await axios.post(
            `${API_BASE}/synthesize`,
            {
                text,
                voice: options.voice || 'zh-CN-XiaoxiaoNeural',
                rate: options.rate || 0,
                pitch: options.pitch || 0,
                volume: options.volume || 0
            },
            {
                responseType: 'blob'
            }
        )
        return response.data
    } catch (error) {
        console.error('合成语音失败:', error)
        throw error
    }
}

/**
 * 流式合成语音（用于长文本）
 * @param text 要转换的文本
 * @param options TTS 选项
 * @returns 音频 Blob
 */
export async function synthesizeStream(text: string, options: TTSOptions = {}): Promise<Blob> {
    try {
        const response = await axios.post(
            `${API_BASE}/synthesize-stream`,
            {
                text,
                voice: options.voice || 'zh-CN-XiaoxiaoNeural',
                rate: options.rate || 0,
                pitch: options.pitch || 0,
                volume: options.volume || 0
            },
            {
                responseType: 'blob'
            }
        )
        return response.data
    } catch (error) {
        console.error('流式合成失败:', error)
        throw error
    }
}

/**
 * 清理缓存
 */
export async function clearCache(): Promise<void> {
    try {
        await axios.delete(`${API_BASE}/cache`)
    } catch (error) {
        console.error('清理缓存失败:', error)
        throw error
    }
}

// 推荐的中文语音
export const RECOMMENDED_CHINESE_VOICES = [
    {
        name: 'zh-CN-XiaoxiaoNeural',
        displayName: '晓晓 (女声，温柔)',
        gender: 'Female',
        description: '温柔亲切的女声，适合朗读'
    },
    {
        name: 'zh-CN-YunxiNeural',
        displayName: '云希 (男声，沉稳)',
        gender: 'Male',
        description: '沉稳大气的男声'
    },
    {
        name: 'zh-CN-YunyangNeural',
        displayName: '云扬 (男声，专业)',
        gender: 'Male',
        description: '专业播音男声'
    },
    {
        name: 'zh-CN-XiaoyiNeural',
        displayName: '晓伊 (女声，甜美)',
        gender: 'Female',
        description: '甜美可爱的女声'
    },
    {
        name: 'zh-CN-YunjianNeural',
        displayName: '云健 (男声，活力)',
        gender: 'Male',
        description: '充满活力的男声'
    },
    {
        name: 'zh-CN-XiaochenNeural',
        displayName: '晓辰 (女声，知性)',
        gender: 'Female',
        description: '知性优雅的女声'
    }
]
