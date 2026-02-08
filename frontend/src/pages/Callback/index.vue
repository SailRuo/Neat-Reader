<template>
  <div class="callback">
    <div class="callback-content">
      <h1>{{ status === 'loading' ? '处理中...' : status === 'success' ? '授权成功' : '授权失败' }}</h1>
      <p>{{ message }}</p>
      <button v-if="status === 'success'" class="btn btn-primary" @click="closeWindow">
        关闭窗口
      </button>
      <button v-else class="btn btn-secondary" @click="goHome">
        返回首页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const status = ref<'loading' | 'success' | 'error'>('loading')
const message = ref('正在处理授权，请稍候...')

const handleCallback = async () => {
  try {
    console.log('=== Callback 页面：开始处理授权回调 ===')
    console.log('当前URL:', window.location.href)
    
    // 从URL中获取授权码
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    
    console.log('提取到的code:', code)
    console.log('提取到的state:', state)
    
    if (!code) {
      throw new Error('未获取到授权码')
    }
    
    // 判断是百度网盘还是 Qwen 的回调
    const isQwenCallback = window.location.pathname.includes('qwen-callback')
    const messageType = isQwenCallback ? 'qwen-auth-code' : 'baidu-auth-code'
    
    console.log('回调类型:', isQwenCallback ? 'Qwen' : '百度网盘')
    
    // 尝试发送消息给主窗口
    console.log('尝试发送code给主窗口...')
    if (window.opener) {
      console.log('✓ 检测到 window.opener，发送 postMessage')
      window.opener.postMessage({ type: messageType, code, state }, window.location.origin)
    } else if (window.parent !== window) {
      console.log('✓ 检测到父窗口，发送 postMessage')
      window.parent.postMessage({ type: messageType, code, state }, window.location.origin)
    } else {
      console.log('✗ 未检测到父窗口，存储到 localStorage')
      // 存储授权码到localStorage，以便主应用获取
      const storageKey = isQwenCallback ? 'qwen_auth_code' : 'baidupan_auth_code'
      localStorage.setItem(storageKey, code)
      if (state) {
        localStorage.setItem(`${storageKey}_state`, state)
      }
    }
    
    status.value = 'success'
    message.value = `授权成功！授权码: ${code}\n\n窗口将在3秒后自动关闭...`
    
    // 3秒后自动关闭窗口
    setTimeout(() => {
      closeWindow()
    }, 3000)
    
  } catch (error) {
    console.error('处理授权回调失败:', error)
    status.value = 'error'
    message.value = `授权失败: ${error instanceof Error ? error.message : '未知错误'}`
  }
}

const closeWindow = () => {
  if (window.opener) {
    window.close()
  } else {
    router.push('/')
  }
}

const goHome = () => {
  router.push('/')
}

onMounted(() => {
  handleCallback()
})
</script>

<style scoped>
.callback {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f7fa;
}

.callback-content {
  background-color: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.callback-content h1 {
  margin-bottom: 16px;
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.callback-content p {
  margin-bottom: 32px;
  font-size: 16px;
  color: #666;
  line-height: 1.5;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background-color: #4A90E2;
  color: white;
}

.btn-primary:hover {
  background-color: #357ABD;
}

.btn-secondary {
  background-color: #E4E7ED;
  color: #333;
}

.btn-secondary:hover {
  background-color: #C0C4CC;
}
</style>