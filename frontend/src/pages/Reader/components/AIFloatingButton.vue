<template>
  <div class="ai-floating-button" :class="{ 'is-open': isOpen }">
    <button
      class="ai-toggle-btn"
      @click="handleToggle"
      :title="isOpen ? '关闭 AI 助手' : '打开 AI 助手'"
    >
      <svg v-if="!isOpen" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M9 10h.01M15 10h.01M9.5 14.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/>
      </svg>
      <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
// Props
const props = defineProps<{
  isOpen: boolean
}>()

// Emits
const emit = defineEmits<{
  toggle: []
}>()

// 处理切换
const handleToggle = () => {
  emit('toggle')
}
</script>

<style scoped>
.ai-floating-button {
  position: fixed;
  right: 20px;
  bottom: 24px;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-toggle-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: none;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
  opacity: 0.85;
}

.ai-toggle-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
  opacity: 1;
}

.ai-toggle-btn:active {
  transform: scale(0.98);
}

.ai-floating-button.is-open .ai-toggle-btn {
  background: linear-gradient(135deg, rgba(240, 147, 251, 0.9) 0%, rgba(245, 87, 108, 0.9) 100%);
  box-shadow: 0 4px 16px rgba(245, 87, 108, 0.3);
}

.ai-floating-button.is-open .ai-toggle-btn:hover {
  box-shadow: 0 6px 24px rgba(245, 87, 108, 0.4);
}

.icon {
  width: 24px;
  height: 24px;
  transition: transform 0.25s ease;
}

.ai-toggle-btn:hover .icon {
  transform: rotate(5deg);
}

.ai-floating-button.is-open .icon {
  animation: rotate 0.3s ease;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(180deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .ai-floating-button {
    right: 16px;
    bottom: 70px;
  }
  
  .ai-toggle-btn {
    width: 48px;
    height: 48px;
  }
  
  .icon {
    width: 24px;
    height: 24px;
  }
}
</style>
