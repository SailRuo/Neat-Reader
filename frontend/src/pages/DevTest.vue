<template>
  <div class="dev-test-page">
    <h1>开发环境测试</h1>
    
    <div class="test-section">
      <h2>环境检测</h2>
      <div class="test-result">
        <p><strong>运行环境:</strong> {{ environment }}</p>
        <p><strong>window.__TAURI__:</strong> {{ hasTauri }}</p>
        <p><strong>window.electron:</strong> {{ hasElectron }}</p>
        <p><strong>Location:</strong> {{ location }}</p>
      </div>
    </div>

    <div class="test-section">
      <h2>开发者工具</h2>
      <button @click="testOpenDevTools" class="test-button">
        打开开发者工具 (F12)
      </button>
      <p class="test-hint">也可以直接按 F12 键</p>
    </div>

    <div class="test-section">
      <h2>TTS 测试</h2>
      <button @click="testTTS" class="test-button" :disabled="ttsLoading">
        {{ ttsLoading ? '加载中...' : '测试 TTS 语音列表' }}
      </button>
      <div v-if="ttsResult" class="test-result">
        <p><strong>结果:</strong></p>
        <pre>{{ ttsResult }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h2>OAuth 测试</h2>
      <button @click="testOAuth" class="test-button" :disabled="oauthLoading">
        {{ oauthLoading ? '打开中...' : '测试 OAuth 窗口' }}
      </button>
      <div v-if="oauthResult" class="test-result">
        <p><strong>结果:</strong></p>
        <pre>{{ oauthResult }}</pre>
      </div>
    </div>

    <div class="test-section">
      <button @click="$router.push('/')" class="test-button back-button">
        返回首页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { detectEnvironment, api } from '@/api/adapter'
import { openDevTools, diagnoseEnvironment } from '@/utils/devtools'
import { getVoices } from '@/api/tts'

const environment = ref('')
const hasTauri = ref(false)
const hasElectron = ref(false)
const location = ref('')

const ttsLoading = ref(false)
const ttsResult = ref('')

const oauthLoading = ref(false)
const oauthResult = ref('')

onMounted(() => {
  environment.value = detectEnvironment()
  hasTauri.value = typeof window !== 'undefined' && '__TAURI__' in window
  hasElectron.value = typeof window !== 'undefined' && 'electron' in window
  location.value = window.location.href
  
  // 输出诊断信息
  diagnoseEnvironment()
})

const testOpenDevTools = async () => {
  try {
    await openDevTools()
    console.log('✓ 开发者工具命令已发送')
  } catch (error) {
    console.error('✗ 打开开发者工具失败:', error)
  }
}

const testTTS = async () => {
  ttsLoading.value = true
  ttsResult.value = ''
  
  try {
    const voices = await getVoices()
    ttsResult.value = JSON.stringify({
      success: true,
      totalVoices: voices.all.length,
      chineseVoices: voices.chinese.length,
      sampleVoices: voices.chinese.slice(0, 3).map(v => v.FriendlyName || v.ShortName)
    }, null, 2)
    console.log('✓ TTS 测试成功:', voices)
  } catch (error) {
    ttsResult.value = JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, null, 2)
    console.error('✗ TTS 测试失败:', error)
  } finally {
    ttsLoading.value = false
  }
}

const testOAuth = async () => {
  oauthLoading.value = true
  oauthResult.value = ''
  
  try {
    const authUrl = 'https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=hq9yQ9w9kR4YHj1kyYafLygVocobh7Sf&redirect_uri=https://alistgo.com/tool/baidu/callback&scope=basic,netdisk&qrcode=1'
    
    console.log('测试 OAuth 窗口...')
    console.log('环境:', environment.value)
    console.log('URL:', authUrl)
    
    const result = await api.openAuthWindow(authUrl)
    
    oauthResult.value = JSON.stringify(result, null, 2)
    console.log('✓ OAuth 测试结果:', result)
  } catch (error) {
    oauthResult.value = JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, null, 2)
    console.error('✗ OAuth 测试失败:', error)
  } finally {
    oauthLoading.value = false
  }
}
</script>

<style scoped>
.dev-test-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}

h1 {
  color: #2c3e50;
  margin-bottom: 2rem;
}

h2 {
  color: #42b983;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.test-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.test-result {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 1rem;
  margin-top: 1rem;
}

.test-result p {
  margin: 0.5rem 0;
}

.test-result pre {
  background: #f1f3f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.9rem;
}

.test-button {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.test-button:hover:not(:disabled) {
  background: #35a372;
}

.test-button:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.test-button.back-button {
  background: #6c757d;
}

.test-button.back-button:hover {
  background: #5a6268;
}

.test-hint {
  margin-top: 0.5rem;
  color: #6c757d;
  font-size: 0.9rem;
}
</style>
