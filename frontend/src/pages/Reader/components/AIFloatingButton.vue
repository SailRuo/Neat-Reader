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
  /* 默认隐藏在右侧，露出一半（按钮宽 56px，露出 28px） */
  right: -28px;
  bottom: 80px;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: right 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-floating-button:hover {
  /* 悬浮时完整显示 */
  right: 24px;
}

.ai-toggle-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
}

.ai-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.5);
}

.ai-toggle-btn:active {
  transform: scale(0.95);
}

.ai-floating-button.is-open .ai-toggle-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 16px rgba(245, 87, 108, 0.4);
}

.icon {
  width: 28px;
  height: 28px;
  transition: transform 0.3s ease;
}

.ai-toggle-btn:hover .icon {
  transform: rotate(10deg);
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

/* 提示文字 */
.hint-text {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 淡入滑动动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .ai-floating-button {
    /* 小屏露出一半（按钮 48px，露出 24px） */
    right: -24px;
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

/* 深色主题适配 */
.theme-dark .hint-text {
  background: rgba(255, 255, 255, 0.9);
  color: #1a1a1a;
}

.theme-sepia .hint-text {
  background: rgba(61, 40, 23, 0.9);
  color: #f4ecd8;
}

.theme-green .hint-text {
  background: rgba(27, 77, 46, 0.9);
  color: #e8f5e9;
}
</style>
