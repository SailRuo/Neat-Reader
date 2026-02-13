<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="dialog-overlay" @click.self="handleClose">
        <div class="dialog-container" :class="{ 'dialog-error': type === 'error', 'dialog-success': type === 'success', 'dialog-warning': type === 'warning' }">
          <div class="dialog-header">
            <div class="dialog-header-content">
              <div class="dialog-icon" :class="`icon-${type}`">
                <component :is="getIcon()" :size="24" />
              </div>
              <h3 class="dialog-title">{{ title }}</h3>
            </div>
            <button class="dialog-close-btn" @click="handleClose">
              <X :size="20" />
            </button>
          </div>
          <div class="dialog-body">
            <p class="dialog-message">{{ message }}</p>
            <div v-if="details" class="dialog-details">
              <pre>{{ details }}</pre>
            </div>
          </div>
          <div class="dialog-footer">
            <button
              v-for="button in buttons"
              :key="button.text"
              class="dialog-btn"
              :class="{ 
                'btn-primary': button.primary,
                'btn-secondary': !button.primary 
              }"
              @click="() => handleButtonClick(button)"
            >
              <component :is="getButtonIcon(button)" :size="16" />
              <span>{{ button.text }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Check, XIcon } from 'lucide-vue-next';

// 对话框类型
export type DialogType = 'info' | 'success' | 'error' | 'warning';

// 按钮配置
export interface DialogButton {
  text: string;
  primary?: boolean;
  callback?: () => void | Promise<void>;
}

// 属性定义
const props = defineProps<{
  visible: boolean;
  title: string;
  message: string;
  type?: DialogType;
  details?: string;
  buttons?: DialogButton[];
}>();

// 事件定义
const emit = defineEmits<{
  close: [];
  buttonClick: [button: DialogButton];
}>();

// 默认属性 - 使用本地状态避免响应式丢失
const type = ref<DialogType>('info');
const buttons = ref<DialogButton[]>([{ text: '确定', primary: true }]);

// 监听 props 变化，更新本地状态
watch(() => props.type, (newType) => {
  if (newType) {
    type.value = newType;
  }
}, { immediate: true });

watch(() => props.buttons, (newButtons) => {
  if (newButtons && newButtons.length > 0) {
    buttons.value = newButtons;
  }
}, { immediate: true });

// 获取对话框图标
const getIcon = () => {
  switch (type.value) {
    case 'success':
      return CheckCircle;
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    default:
      return Info;
  }
};

// 获取按钮图标
const getButtonIcon = (button: DialogButton) => {
  if (button.primary) {
    return Check;
  }
  return XIcon;
};

// 方法
const handleClose = () => {
  emit('close');
};

const handleButtonClick = async (button: DialogButton) => {
  if (button.callback) {
    await button.callback();
  }
  emit('buttonClick', button);
  emit('close');
};
</script>

<style scoped>
/* 遮罩层 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

/* 对话框容器 */
.dialog-container {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  overflow: hidden;
  animation: dialogFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(203, 213, 225, 0.3);
}

/* 对话框类型样式 */
.dialog-error {
  border-top: 3px solid #EF4444;
}

.dialog-success {
  border-top: 3px solid #10B981;
}

.dialog-warning {
  border-top: 3px solid #F59E0B;
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-container,
.dialog-fade-leave-to .dialog-container {
  transform: scale(0.95) translateY(-20px);
}

/* 淡入动画 */
@keyframes dialogFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 头部 */
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(203, 213, 225, 0.3);
  background: linear-gradient(to bottom, #FFFFFF, #F9FAFB);
}

.dialog-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}

.dialog-icon.icon-success {
  background: linear-gradient(135deg, #10B981, #059669);
  color: white;
}

.dialog-icon.icon-error {
  background: linear-gradient(135deg, #EF4444, #DC2626);
  color: white;
}

.dialog-icon.icon-warning {
  background: linear-gradient(135deg, #F59E0B, #D97706);
  color: white;
}

.dialog-icon.icon-info {
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  color: white;
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1E293B;
}

.dialog-close-btn {
  background: transparent;
  border: none;
  color: #64748B;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.dialog-close-btn:hover {
  background-color: rgba(203, 213, 225, 0.3);
  color: #1E293B;
  transform: rotate(90deg);
}

/* 内容 */
.dialog-body {
  padding: 24px;
  background: white;
}

.dialog-message {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.dialog-details {
  background: linear-gradient(to bottom, #F8FAFC, #F1F5F9);
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0 0 0;
  overflow: auto;
  max-height: 200px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  color: #334155;
}

.dialog-details pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 底部 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(203, 213, 225, 0.3);
  background: linear-gradient(to top, #FFFFFF, #F9FAFB);
}

/* 按钮 */
.dialog-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-width: 100px;
}

.dialog-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.dialog-btn:hover::before {
  left: 100%;
}

.dialog-btn:active {
  transform: scale(0.96);
}

/* 次要按钮 */
.dialog-btn.btn-secondary {
  background: linear-gradient(to bottom, #FFFFFF, #F8FAFC);
  color: #475569;
  border: 1px solid rgba(203, 213, 225, 0.5);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dialog-btn.btn-secondary:hover {
  background: linear-gradient(to bottom, #F8FAFC, #F1F5F9);
  border-color: rgba(203, 213, 225, 0.8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* 主要按钮 */
.dialog-btn.btn-primary {
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  color: white;
  border: 1px solid transparent;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
}

.dialog-btn.btn-primary:hover {
  background: linear-gradient(135deg, #357ABD, #2868A8);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
  transform: translateY(-1px);
}

.dialog-btn.btn-primary:active {
  box-shadow: 0 1px 4px rgba(74, 144, 226, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dialog-container {
    width: 95%;
    margin: 16px;
    border-radius: 12px;
  }

  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding: 16px;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-btn {
    width: 100%;
    min-width: unset;
  }
}
</style>