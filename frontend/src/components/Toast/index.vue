<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-item"
        :class="toast.type"
      >
        <div class="toast-icon">
          <Icons.CheckCircle v-if="toast.type === 'success'" :size="16" />
          <Icons.AlertCircle v-else-if="toast.type === 'error'" :size="16" />
          <Icons.AlertTriangle v-else-if="toast.type === 'warning'" :size="16" />
          <Icons.Info v-else :size="16" />
        </div>
        <div class="toast-message">{{ toast.message }}</div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDialogStore } from '../../stores/dialog'
import * as Icons from 'lucide-vue-next'

const dialogStore = useDialogStore()
const toasts = computed(() => dialogStore.toasts)
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  min-width: 120px;
  max-width: 400px;
}

.toast-message {
  font-size: 14px;
  color: #333;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 成功状态 */
.toast-item.success {
  border-left: 4px solid #52c41a;
}
.toast-item.success .toast-icon {
  color: #52c41a;
}

/* 错误状态 */
.toast-item.error {
  border-left: 4px solid #ff4d4f;
}
.toast-item.error .toast-icon {
  color: #ff4d4f;
}

/* 警告状态 */
.toast-item.warning {
  border-left: 4px solid #faad14;
}
.toast-item.warning .toast-icon {
  color: #faad14;
}

/* 信息状态 */
.toast-item.info {
  border-left: 4px solid #1890ff;
}
.toast-item.info .toast-icon {
  color: #1890ff;
}

/* 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
