<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="dialog-overlay" @click.self="handleClose">
        <div class="dialog-content" @click.stop>
          <!-- 头部 -->
          <div class="dialog-header">
            <h3 class="dialog-title">{{ isEdit ? '编辑笔记' : '添加笔记' }}</h3>
            <button class="close-btn" @click="handleClose">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- 选中的文本 -->
          <div v-if="selectedText" class="selected-text">
            <div class="selected-text-label">选中文本</div>
            <div class="selected-text-content">{{ selectedText }}</div>
          </div>

          <!-- 笔记输入 -->
          <div class="note-input-container">
            <textarea
              ref="textareaRef"
              v-model="localNote"
              class="note-textarea"
              placeholder="输入你的笔记..."
              rows="6"
              @keydown.meta.enter="handleSave"
              @keydown.ctrl.enter="handleSave"
            ></textarea>
          </div>

          <!-- 底部按钮 -->
          <div class="dialog-footer">
            <button class="btn btn-secondary" @click="handleClose">
              取消
            </button>
            <button 
              class="btn btn-primary" 
              @click="handleSave"
              :disabled="!localNote.trim()"
            >
              {{ isEdit ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

// Props
const props = defineProps<{
  visible: boolean
  selectedText?: string
  note?: string
  isEdit?: boolean
}>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [note: string]
  close: []
}>()

// 状态
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const localNote = ref('')

// 监听 visible 变化
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    localNote.value = props.note || ''
    await nextTick()
    textareaRef.value?.focus()
  }
})

// 关闭对话框
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// 保存笔记
const handleSave = () => {
  if (!localNote.value.trim()) return
  emit('save', localNote.value.trim())
  handleClose()
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.dialog-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #E2E8F0;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1E293B;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #64748B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #F1F5F9;
  color: #1E293B;
}

.selected-text {
  padding: 16px 24px;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
}

.selected-text-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.selected-text-content {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  max-height: 100px;
  overflow-y: auto;
}

.note-input-container {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.note-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #1E293B;
  resize: vertical;
  min-height: 120px;
  transition: all 0.2s;
}

.note-textarea:focus {
  outline: none;
  border-color: #4A90E2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.note-textarea::placeholder {
  color: #94A3B8;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E2E8F0;
  background: #F8FAFC;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: white;
  color: #64748B;
  border: 1px solid #E2E8F0;
}

.btn-secondary:hover {
  background: #F8FAFC;
  border-color: #CBD5E1;
}

.btn-primary {
  background: linear-gradient(135deg, #4A90E2, #357ABD);
  color: white;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s;
}

.dialog-fade-enter-active .dialog-content,
.dialog-fade-leave-active .dialog-content {
  transition: transform 0.2s;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-content {
  transform: scale(0.95) translateY(20px);
}

.dialog-fade-leave-to .dialog-content {
  transform: scale(0.95) translateY(20px);
}
</style>
