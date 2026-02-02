<template>
  <div class="loading-overlay">
    <div class="loading-content">
      <div class="spinner"></div>
      <p>{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const message = ref('正在加载书籍...')

onMounted(() => {
  // 如果加载时间过长，更新提示信息
  setTimeout(() => {
    message.value = '正在生成目录...'
  }, 1500)
  
  setTimeout(() => {
    message.value = '正在恢复阅读进度...'
  }, 3000)
  
  setTimeout(() => {
    message.value = '即将完成...'
  }, 4500)
})
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: inherit;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(74, 144, 226, 0.2);
  border-top-color: #4a90e2;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-content p {
  font-size: 14px;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}
</style>
