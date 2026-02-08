import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as ttsAPI from '@/api/tts'

export type TTSEngine = 'browser' | 'edge' | 'piper'

export interface TTSOptions {
    lang?: string
    rate?: number
    volume?: number
    pitch?: number
    engine?: TTSEngine
    voice?: string
}

// 音频片段缓存
interface AudioSegment {
    text: string
    audioBlob?: Blob
    audioUrl?: string
    isLoading: boolean
    error?: string
}

export function useTextToSpeech() {
    const isPlaying = ref(false)
    const isPaused = ref(false)
    const voices = ref<SpeechSynthesisVoice[]>([])
    const edgeVoices = ref<ttsAPI.TTSVoice[]>([])
    const selectedVoice = ref<SpeechSynthesisVoice | null>(null)
    const selectedEdgeVoice = ref<string>('zh-CN-XiaoxiaoNeural')
    const engine = ref<TTSEngine>('edge') // 默认使用 Edge TTS
    const rate = ref(1.0)
    const volume = ref(1.0)
    const pitch = ref(1.0)
    const currentText = ref('')
    const currentAudio = ref<HTMLAudioElement | null>(null)
    
    // 分段朗读相关
    const segments = ref<AudioSegment[]>([])
    const currentSegmentIndex = ref(0)
    const isLoadingSegments = ref(false)

    // 检查是否支持 TTS
    const isSupported = computed(() => {
        return 'speechSynthesis' in window
    })

    // 智能分段：按句子分割，每段最多 500 字符
    const splitTextIntoSegments = (text: string, maxLength: number = 500): string[] => {
        if (text.length <= maxLength) {
            return [text]
        }

        const segments: string[] = []
        // 按句子分割（中文句号、问号、感叹号、英文句号等）
        const sentences = text.split(/([。！？\.!?；;])/g)
        
        let currentSegment = ''
        
        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i]
            
            // 如果当前段落加上新句子不超过限制，就添加
            if ((currentSegment + sentence).length <= maxLength) {
                currentSegment += sentence
            } else {
                // 如果当前段落不为空，保存它
                if (currentSegment.trim()) {
                    segments.push(currentSegment.trim())
                }
                // 开始新段落
                currentSegment = sentence
            }
        }
        
        // 添加最后一段
        if (currentSegment.trim()) {
            segments.push(currentSegment.trim())
        }
        
        console.log(`📄 文本分段: 总长度 ${text.length} 字符，分为 ${segments.length} 段`)
        return segments
    }

    // 加载可用语音列表
    const loadVoices = () => {
        if (!isSupported.value) return

        const loadVoiceList = () => {
            voices.value = window.speechSynthesis.getVoices()

            // 尝试选择中文语音作为默认
            const zhVoice = voices.value.find(v =>
                v.lang.startsWith('zh') || v.lang.includes('Chinese')
            )
            if (zhVoice && !selectedVoice.value) {
                selectedVoice.value = zhVoice
            }

            console.log('🔊 可用语音数量:', voices.value.length)
        }

        // Chrome 需要监听 voiceschanged 事件
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoiceList
        }

        loadVoiceList()
    }

    // 加载 Edge TTS 语音列表
    const loadEdgeVoices = async () => {
        try {
            const result = await ttsAPI.getVoices()
            edgeVoices.value = result.chinese
            console.log('🔊 Edge TTS 中文语音数量:', edgeVoices.value.length)
        } catch (error) {
            console.error('❌ 加载 Edge TTS 语音失败:', error)
        }
    }

    // 朗读文本
    const speak = async (text: string, options?: TTSOptions) => {
        console.log('🎯 [useTextToSpeech] speak 方法被调用')
        console.log('🎯 [useTextToSpeech] text 长度:', text?.length)
        console.log('🎯 [useTextToSpeech] text 前50字:', text?.substring(0, 50))
        console.log('🎯 [useTextToSpeech] options:', options)
        console.log('🎯 [useTextToSpeech] engine:', options?.engine || engine.value)
        
        if (!text.trim()) {
            console.warn('⚠️ [useTextToSpeech] 文本为空，跳过朗读')
            return
        }

        // 停止当前朗读
        stop()

        currentText.value = text
        const selectedEngine = options?.engine || engine.value
        
        console.log('🎯 [useTextToSpeech] 使用引擎:', selectedEngine)

        if (selectedEngine === 'edge') {
            console.log('🎯 [useTextToSpeech] 调用 speakWithEdge')
            await speakWithEdge(text, options)
        } else if (selectedEngine === 'piper') {
            console.log('🎯 [useTextToSpeech] 调用 speakWithPiper')
            await speakWithPiper(text, options)
        } else {
            console.log('🎯 [useTextToSpeech] 调用 speakWithBrowser')
            speakWithBrowser(text, options)
        }
    }

    // 使用浏览器 TTS
    const speakWithBrowser = (text: string, options?: TTSOptions) => {
        if (!isSupported.value) return

        const utterance = new SpeechSynthesisUtterance(text)

        // 应用设置
        utterance.lang = options?.lang || 'zh-CN'
        utterance.rate = options?.rate ?? rate.value
        utterance.volume = options?.volume ?? volume.value
        utterance.pitch = options?.pitch ?? pitch.value

        if (selectedVoice.value) {
            utterance.voice = selectedVoice.value
        }

        // 事件处理
        utterance.onstart = () => {
            isPlaying.value = true
            isPaused.value = false
            console.log('🔊 开始朗读 (浏览器)')
        }

        utterance.onend = () => {
            isPlaying.value = false
            isPaused.value = false
            console.log('🔊 朗读结束')
        }

        utterance.onerror = (event) => {
            console.error('🔊 朗读错误:', event.error)
            isPlaying.value = false
            isPaused.value = false
        }

        utterance.onpause = () => {
            isPaused.value = true
        }

        utterance.onresume = () => {
            isPaused.value = false
        }

        window.speechSynthesis.speak(utterance)
    }

    // 使用 Edge TTS
    const speakWithEdge = async (text: string, options?: TTSOptions) => {
        try {
            console.log('🔊 开始 Edge TTS 分段朗读')
            isPlaying.value = true
            isPaused.value = false
            isLoadingSegments.value = true

            // 分段
            const textSegments = splitTextIntoSegments(text, 500)
            segments.value = textSegments.map(text => ({
                text,
                isLoading: false
            }))
            currentSegmentIndex.value = 0

            // 预加载前 3 段
            await preloadSegments(0, Math.min(3, segments.value.length), options)
            
            isLoadingSegments.value = false

            // 开始播放第一段
            await playSegment(0, options)
        } catch (error) {
            console.error('❌ Edge TTS 朗读失败:', error)
            isPlaying.value = false
            isPaused.value = false
            isLoadingSegments.value = false
        }
    }

    // 预加载音频片段
    const preloadSegments = async (startIndex: number, endIndex: number, options?: TTSOptions) => {
        const promises = []
        
        for (let i = startIndex; i < endIndex && i < segments.value.length; i++) {
            const segment = segments.value[i]
            
            // 跳过已加载或正在加载的片段
            if (segment.audioBlob || segment.isLoading) {
                continue
            }
            
            segment.isLoading = true
            
            const promise = (async () => {
                try {
                    console.log(`📥 预加载片段 ${i + 1}/${segments.value.length}: "${segment.text.substring(0, 30)}..."`)
                    
                    const audioBlob = await ttsAPI.synthesize(segment.text, {
                        voice: options?.voice || selectedEdgeVoice.value,
                        rate: Math.round(((options?.rate ?? rate.value) - 1) * 100),
                        pitch: Math.round(((options?.pitch ?? pitch.value) - 1) * 50),
                        volume: Math.round(((options?.volume ?? volume.value) - 1) * 50)
                    })
                    
                    segment.audioBlob = audioBlob
                    segment.audioUrl = URL.createObjectURL(audioBlob)
                    segment.isLoading = false
                    
                    console.log(`✅ 片段 ${i + 1} 加载完成`)
                } catch (error) {
                    console.error(`❌ 片段 ${i + 1} 加载失败:`, error)
                    segment.error = error instanceof Error ? error.message : '加载失败'
                    segment.isLoading = false
                }
            })()
            
            promises.push(promise)
        }
        
        await Promise.all(promises)
    }

    // 播放指定片段
    const playSegment = async (index: number, options?: TTSOptions) => {
        if (index >= segments.value.length) {
            // 所有片段播放完毕
            console.log('🎉 所有片段播放完毕')
            isPlaying.value = false
            isPaused.value = false
            cleanupSegments()
            return
        }

        const segment = segments.value[index]
        currentSegmentIndex.value = index

        // 如果片段还在加载，等待
        if (segment.isLoading) {
            console.log(`⏳ 等待片段 ${index + 1} 加载...`)
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (!segment.isLoading) {
                        clearInterval(checkInterval)
                        resolve(null)
                    }
                }, 100)
            })
        }

        // 如果加载失败，跳过这一段
        if (segment.error || !segment.audioUrl) {
            console.warn(`⚠️ 跳过失败的片段 ${index + 1}`)
            await playSegment(index + 1, options)
            return
        }

        try {
            console.log(`▶️ 播放片段 ${index + 1}/${segments.value.length}`)
            
            // 创建音频对象
            const audio = new Audio(segment.audioUrl)
            currentAudio.value = audio

            // 音频播放结束后，播放下一段
            audio.onended = async () => {
                console.log(`✅ 片段 ${index + 1} 播放完成`)
                
                // 预加载后续片段
                const nextPreloadIndex = index + 3
                if (nextPreloadIndex < segments.value.length) {
                    preloadSegments(nextPreloadIndex, nextPreloadIndex + 1, options)
                }
                
                // 播放下一段
                await playSegment(index + 1, options)
            }

            audio.onerror = (error) => {
                console.error(`❌ 片段 ${index + 1} 播放错误:`, error)
                // 尝试播放下一段
                playSegment(index + 1, options)
            }

            // 播放音频
            await audio.play()
        } catch (error) {
            console.error(`❌ 播放片段 ${index + 1} 失败:`, error)
            // 尝试播放下一段
            await playSegment(index + 1, options)
        }
    }

    // 清理片段缓存
    const cleanupSegments = () => {
        segments.value.forEach(segment => {
            if (segment.audioUrl) {
                URL.revokeObjectURL(segment.audioUrl)
            }
        })
        segments.value = []
        currentSegmentIndex.value = 0
    }

    // 使用 Piper TTS (预留接口)
    const speakWithPiper = async (text: string, options?: TTSOptions) => {
        console.warn('⚠️ Piper TTS 尚未实现')
        // TODO: 实现 Piper TTS
    }

    // 暂停
    const pause = () => {
        if (engine.value === 'browser' && isSupported.value) {
            window.speechSynthesis.pause()
            isPaused.value = true
        } else if (currentAudio.value) {
            currentAudio.value.pause()
            isPaused.value = true
        }
    }

    // 继续
    const resume = () => {
        if (engine.value === 'browser' && isSupported.value) {
            window.speechSynthesis.resume()
            isPaused.value = false
        } else if (currentAudio.value) {
            currentAudio.value.play()
            isPaused.value = false
        }
    }

    // 停止
    const stop = () => {
        if (engine.value === 'browser' && isSupported.value) {
            window.speechSynthesis.cancel()
        }
        
        if (currentAudio.value) {
            currentAudio.value.pause()
            currentAudio.value.currentTime = 0
            currentAudio.value = null
        }
        
        // 清理分段缓存
        cleanupSegments()
        
        isPlaying.value = false
        isPaused.value = false
        currentText.value = ''
        isLoadingSegments.value = false
    }

    // 切换播放/暂停
    const toggle = () => {
        if (isPaused.value) {
            resume()
        } else if (isPlaying.value) {
            pause()
        }
    }

    // 设置语速
    const setRate = (newRate: number) => {
        rate.value = Math.max(0.5, Math.min(2, newRate))
    }

    // 设置音量
    const setVolume = (newVolume: number) => {
        volume.value = Math.max(0, Math.min(1, newVolume))
    }

    // 设置语音
    const setVoice = (voice: SpeechSynthesisVoice) => {
        selectedVoice.value = voice
        console.log('🔊 切换语音:', voice.name, voice.lang)
        
        // 🎯 如果正在朗读，重新开始以应用新语音
        if (isPlaying.value && currentText.value) {
            const wasPlaying = !isPaused.value
            const textToSpeak = currentText.value
            
            // 停止当前朗读
            stop()
            
            // 使用新语音重新朗读
            if (wasPlaying) {
                setTimeout(() => {
                    speak(textToSpeak)
                }, 100)
            }
        }
    }

    // 设置 Edge 语音
    const setEdgeVoice = (voiceName: string) => {
        selectedEdgeVoice.value = voiceName
        console.log('🔊 切换 Edge 语音:', voiceName)
    }

    // 设置 TTS 引擎
    const setEngine = (newEngine: TTSEngine) => {
        engine.value = newEngine
        console.log('🔊 切换 TTS 引擎:', newEngine)
    }

    // 获取中文语音列表
    const chineseVoices = computed(() => {
        return voices.value.filter(v =>
            v.lang.startsWith('zh') || v.lang.includes('Chinese')
        )
    })

    // 初始化
    onMounted(() => {
        loadVoices()
        loadEdgeVoices()
    })

    // 清理
    onUnmounted(() => {
        stop()
    })

    return {
        // 状态
        isSupported,
        isPlaying,
        isPaused,
        voices,
        edgeVoices,
        chineseVoices,
        selectedVoice,
        selectedEdgeVoice,
        engine,
        rate,
        volume,
        pitch,
        currentText,
        // 分段朗读状态
        segments,
        currentSegmentIndex,
        isLoadingSegments,

        // 方法
        speak,
        pause,
        resume,
        stop,
        toggle,
        setRate,
        setVolume,
        setVoice,
        setEdgeVoice,
        setEngine,
        loadVoices,
        loadEdgeVoices
    }
}
