<template>
  <div class="tts-settings">
    <h3>语音朗读设置</h3>
    
    <!-- TTS 引擎选择 -->
    <div class="setting-group">
      <label>TTS 引擎</label>
      <select v-model="selectedEngine" @change="onEngineChange">
        <option value="browser">浏览器内置 (离线)</option>
        <option value="edge">Edge TTS (在线，高质量)</option>
        <option value="piper" disabled>Piper TTS (开发中)</option>
      </select>
      <p class="hint">
        <span v-if="selectedEngine === 'browser'">使用系统内置语音，无需网络</span>
        <span v-else-if="selectedEngine === 'edge'">使用微软 Edge 语音，需要网络连接</span>
      </p>
    </div>

    <!-- 浏览器语音选择 -->
    <div v-if="selectedEngine === 'browser'" class="setting-group">
      <label>语音选择</label>
      <select v-model="selectedBrowserVoice" @change="onBrowserVoiceChange">
        <optgroup label="中文语音">
          <option 
            v-for="voice in chineseVoices" 
            :key="voice.name"
            :value="voice.name"
          >
            {{ voice.name }} ({{ voice.lang }})
          </option>
        </optgroup>
        <optgroup label="其他语音" v-if="otherVoices.length > 0">
          <option 
            v-for="voice in otherVoices" 
            :key="voice.name"
            :value="voice.name"
          >
            {{ voice.name }} ({{ voice.lang }})
          </option>
        </optgroup>
      </select>
    </div>

    <!-- Edge 语音选择 -->
    <div v-if="selectedEngine === 'edge'" class="setting-group">
      <label>语音选择</label>
      <select v-model="selectedEdgeVoiceName" @change="onEdgeVoiceChange">
        <option 
          v-for="voice in recommendedVoices" 
          :key="voice.name"
          :value="voice.name"
        >
          {{ voice.displayName }}
        </option>
        <optgroup label="更多语音" v-if="edgeVoices.length > 0">
          <option 
            v-for="voice in edgeVoices" 
            :key="voice.ShortName"
            :value="voice.ShortName"
          >
            {{ voice.FriendlyName }}
          </option>
        </optgroup>
      </select>
      <p class="hint">{{ currentVoiceDescription }}</p>
    </div>

    <!-- 语速控制 -->
    <div class="setting-group">
      <label>语速: {{ rate.toFixed(1) }}x</label>
      <input 
        type="range" 
        v-model.number="rate" 
        min="0.5" 
        max="2" 
        step="0.1"
        @input="onRateChange"
      />
    </div>

    <!-- 音量控制 -->
    <div class="setting-group">
      <label>音量: {{ Math.round(volume * 100) }}%</label>
      <input 
        type="range" 
        v-model.number="volume" 
        min="0" 
        max="1" 
        step="0.1"
        @input="onVolumeChange"
      />
    </div>

    <!-- 音调控制 (仅浏览器引擎) -->
    <div v-if="selectedEngine === 'browser'" class="setting-group">
      <label>音调: {{ pitch.toFixed(1) }}</label>
      <input 
        type="range" 
        v-model.number="pitch" 
        min="0.5" 
        max="2" 
        step="0.1"
      />
    </div>

    <!-- 测试按钮 -->
    <div class="setting-group">
      <button @click="testVoice" class="test-btn">
        {{ isPlaying ? '停止测试' : '测试语音' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { RECOMMENDED_CHINESE_VOICES } from '@/api/tts'
import type { TTSEngine } from '@/pages/Reader/composables/useTextToSpeech'

// 接收外部 TTS 实例
const props = defineProps<{
  tts?: any
}>()

const selectedEngine = ref<TTSEngine>('edge') // 默认使用 Edge TTS
const selectedBrowserVoice = ref<string>('')
const selectedEdgeVoiceName = ref<string>('zh-CN-XiaoxiaoNeural')
const rate = ref(1.0)
const volume = ref(1.0)
const pitch = ref(1.0)
const edgeVoices = ref<any[]>([]) // 添加 edgeVoices 定义

const recommendedVoices = RECOMMENDED_CHINESE_VOICES

// 使用传入的 TTS 实例
const tts = computed(() => props.tts)

// 计算属性
const chineseVoices = computed(() => {
  if (!tts.value) return []
  return tts.value.voices.value.filter((v: any) => 
    v.lang.startsWith('zh') || v.lang.includes('Chinese')
  )
})

const otherVoices = computed(() => {
  if (!tts.value) return []
  return tts.value.voices.value.filter((v: any) => 
    !v.lang.startsWith('zh') && !v.lang.includes('Chinese')
  )
})

const currentVoiceDescription = computed(() => {
  const voice = recommendedVoices.find(v => v.name === selectedEdgeVoiceName.value)
  return voice?.description || ''
})

const isPlaying = computed(() => tts.value?.isPlaying.value || false)

// 事件处理
const onEngineChange = () => {
  tts.value?.setEngine(selectedEngine.value)
}

const onBrowserVoiceChange = () => {
  if (!tts.value) return
  const voice = tts.value.voices.value.find((v: any) => v.name === selectedBrowserVoice.value)
  if (voice) {
    tts.value.setVoice(voice)
  }
}

const onEdgeVoiceChange = () => {
  tts.value?.setEdgeVoice(selectedEdgeVoiceName.value)
}

const onRateChange = () => {
  tts.value?.setRate(rate.value)
}

const onVolumeChange = () => {
  tts.value?.setVolume(volume.value)
}

const testVoice = () => {
  console.log('🎯 [TTSSettings] 点击测试语音按钮')
  console.log('🎯 [TTSSettings] props.tts:', props.tts)
  console.log('🎯 [TTSSettings] tts.value:', tts.value)
  console.log('🎯 [TTSSettings] tts.value?.speak:', tts.value?.speak)
  console.log('🎯 [TTSSettings] isPlaying:', isPlaying.value)
  
  if (!tts.value) {
    console.error('❌ [TTSSettings] TTS 实例不存在')
    alert('TTS 实例未初始化，请刷新页面重试')
    return
  }
  
  if (isPlaying.value) {
    console.log('🎯 [TTSSettings] 停止播放')
    try {
      tts.value.stop()
      console.log('✅ [TTSSettings] 停止成功')
    } catch (error) {
      console.error('❌ [TTSSettings] 停止失败:', error)
    }
  } else {
    const testText = '你好，这是语音测试。Neat Reader 是一个简洁优雅的电子书阅读器。'
    console.log('🎯 [TTSSettings] 开始播放测试文本:', testText)
    try {
      tts.value.speak(testText, {
        engine: selectedEngine.value,
        voice: selectedEdgeVoiceName.value,
        rate: rate.value,
        volume: volume.value,
        pitch: pitch.value
      })
      console.log('✅ [TTSSettings] speak 方法调用成功')
    } catch (error) {
      console.error('❌ [TTSSettings] speak 方法调用失败:', error)
      alert('测试失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }
}

// 初始化
onMounted(() => {
  if (!tts.value) return
  
  // 设置默认引擎为 Edge TTS
  tts.value.setEngine('edge')
  selectedEngine.value = 'edge'
  
  // 同步其他设置
  rate.value = tts.value.rate.value
  volume.value = tts.value.volume.value
  pitch.value = tts.value.pitch.value
  
  // 设置默认浏览器语音
  if (tts.value.selectedVoice.value) {
    selectedBrowserVoice.value = tts.value.selectedVoice.value.name
  } else if (chineseVoices.value.length > 0) {
    selectedBrowserVoice.value = chineseVoices.value[0].name
  }
  
  // 设置默认 Edge 语音
  selectedEdgeVoiceName.value = tts.value.selectedEdgeVoice.value
})

// 监听 TTS 状态变化
watch(() => tts.value?.selectedVoice.value, (newVoice) => {
  if (newVoice) {
    selectedBrowserVoice.value = newVoice.name
  }
})
</script>

<style scoped>
.tts-settings {
  padding: 20px;
  max-width: 500px;
}

h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
}

.setting-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

select,
input[type="range"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

select {
  background-color: white;
  cursor: pointer;
}

select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

input[type="range"] {
  padding: 0;
  cursor: pointer;
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.test-btn {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.test-btn:hover {
  background-color: #45a049;
}

.test-btn:active {
  background-color: #3d8b40;
}

optgroup {
  font-weight: 600;
}
</style>
