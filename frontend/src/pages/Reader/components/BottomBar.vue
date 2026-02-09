<template>
  <div class="bottom-bar" :class="`theme-${theme}`" @click.stop>
    <div class="controls-section">
      <!-- 主题 -->
      <div class="control-group">
        <label>主题</label>
        <div class="theme-options">
          <button
            v-for="t in themes"
            :key="t.value"
            :class="['theme-btn', t.value, { active: theme === t.value }]"
            @click="$emit('update:theme', t.value)"
            :title="t.label"
          >
            <div class="theme-preview" :style="{ background: t.color }"></div>
          </button>
        </div>
      </div>
      
      <!-- 字号 -->
      <div class="control-group">
        <label>字号</label>
        <div class="stepper">
          <button @click="$emit('update:fontSize', fontSize - 1)" :disabled="fontSize <= 12">-</button>
          <span>{{ fontSize }}px</span>
          <button @click="$emit('update:fontSize', fontSize + 1)" :disabled="fontSize >= 30">+</button>
        </div>
      </div>
      
      <!-- 行间距 -->
      <div class="control-group">
        <label>行间距</label>
        <div class="segment-options">
          <button
            v-for="h in lineHeights"
            :key="h"
            :class="['segment-btn', { active: lineHeight === h }]"
            @click="$emit('update:lineHeight', h)"
          >
            {{ h }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  progress: number
  currentPage: number
  totalPages: number
  theme: string
  fontSize: number
  lineHeight: number
}>()

const emit = defineEmits<{
  'update:progress': [value: number]
  'update:theme': [value: string]
  'update:fontSize': [value: number]
  'update:lineHeight': [value: number]
}>()

const themes = [
  { value: 'light', label: '明亮', color: '#ffffff' },
  { value: 'sepia', label: '护眼', color: '#f4ecd8' },
  { value: 'green', label: '护眼绿', color: '#e8f5e9' },
  { value: 'dark', label: '夜晚', color: '#1a1a1a' }
]

const lineHeights = [1.2, 1.5, 1.8, 2.0]
</script>

<style scoped>
.bottom-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 900px;
  width: calc(100% - 48px);
  padding: 20px 28px;
  background: rgba(255, 255, 255, 0.96);
  -webkit-backdrop-filter: blur(24px);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #1a1a1a;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.bottom-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(74, 144, 226, 0.3), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.bottom-bar:hover::before {
  opacity: 1;
}

.bottom-bar.theme-sepia {
  background: rgba(244, 236, 216, 0.96);
  color: #3d2817;
  border-color: rgba(61, 40, 23, 0.15);
  box-shadow: 0 12px 40px rgba(61, 40, 23, 0.2);
}

.bottom-bar.theme-green {
  background: rgba(232, 245, 233, 0.96);
  color: #1b4d2e;
  border-color: rgba(27, 77, 46, 0.15);
  box-shadow: 0 12px 40px rgba(27, 77, 46, 0.2);
}

.bottom-bar.theme-dark {
  background: rgba(26, 26, 26, 0.96);
  color: #e8e8e8;
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.bottom-bar.theme-dark::before {
  background: linear-gradient(90deg, transparent, rgba(106, 169, 244, 0.4), transparent);
}

.controls-section {
  display: grid;
  grid-template-columns: auto repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: center;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.control-group:first-child {
  min-width: 180px;
}

.control-group label {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.8;
  letter-spacing: 0.5px;
  transition: opacity 0.2s ease;
}

.control-group:hover label {
  opacity: 1;
}

.theme-options {
  display: flex;
  gap: 8px;
  align-items: center;
}

.theme-btn {
  width: 40px;
  height: 40px;
  border: 2px solid transparent;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.theme-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(74, 144, 226, 0.1);
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
}

.theme-btn:hover::before {
  width: 100px;
  height: 100px;
}

.theme-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.2);
}

.theme-btn.active {
  border-color: #4a90e2;
  box-shadow: 0 0 0 1px rgba(74, 144, 226, 0.3), 0 4px 16px rgba(74, 144, 226, 0.3);
}

.theme-btn.active::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid transparent;
  border-radius: 50%;
  background: linear-gradient(45deg, #4a90e2, #6AA9F4, #4a90e2) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: borderRotate 3s linear infinite;
}

@keyframes borderRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.theme-preview {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.theme-btn:hover .theme-preview {
  transform: scale(0.95);
}

.theme-dark .theme-preview {
  border-color: rgba(255, 255, 255, 0.2);
}

.stepper {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  padding: 8px;
  transition: all 0.2s ease;
}

.control-group:hover .stepper {
  background: rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.theme-dark .stepper {
  background: rgba(255, 255, 255, 0.04);
}

.theme-dark .control-group:hover .stepper {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.theme-sepia .stepper {
  background: rgba(91, 70, 54, 0.04);
}

.theme-sepia .control-group:hover .stepper {
  background: rgba(91, 70, 54, 0.06);
}

.theme-green .stepper {
  background: rgba(45, 90, 61, 0.04);
}

.theme-green .control-group:hover .stepper {
  background: rgba(45, 90, 61, 0.06);
}

.stepper button {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.2s ease;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.stepper button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(74, 144, 226, 0.1);
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
}

.stepper button:hover::before {
  width: 100px;
  height: 100px;
}

.stepper button:hover:not(:disabled) {
  background: rgba(74, 144, 226, 0.1);
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.2);
}

.stepper button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.stepper span {
  flex: 1;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
  color: inherit;
}

.segment-options {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  padding: 4px;
  transition: all 0.2s ease;
}

.control-group:hover .segment-options {
  background: rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.theme-dark .segment-options {
  background: rgba(255, 255, 255, 0.04);
}

.theme-dark .control-group:hover .segment-options {
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.theme-sepia .segment-options {
  background: rgba(91, 70, 54, 0.04);
}

.theme-sepia .control-group:hover .segment-options {
  background: rgba(91, 70, 54, 0.06);
}

.theme-green .segment-options {
  background: rgba(45, 90, 61, 0.04);
}

.theme-green .control-group:hover .segment-options {
  background: rgba(45, 90, 61, 0.06);
}

.segment-btn {
  flex: 1;
  padding: 8px 6px;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
  color: inherit;
  min-width: 0;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.segment-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(74, 144, 226, 0.1);
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
}

.segment-btn:hover::before {
  width: 100px;
  height: 100px;
}

.segment-btn:hover {
  background: rgba(74, 144, 226, 0.08);
  transform: translateY(-1px);
}

.segment-btn.active {
  background: linear-gradient(135deg, #4a90e2, #6AA9F4);
  color: white;
  box-shadow: 0 4px 16px rgba(74, 144, 226, 0.4);
  transform: translateY(-1px);
}

.segment-btn.active::before {
  display: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .bottom-bar {
    bottom: 16px;
    width: calc(100% - 32px);
    padding: 18px 24px;
    border-radius: 16px;
    gap: 16px;
  }
  
  .controls-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .control-group:first-child {
    grid-column: 1 / -1;
    min-width: auto;
  }
  
  .theme-options {
    justify-content: center;
  }
  
  .theme-btn {
    width: 36px;
    height: 36px;
  }
  
  .stepper button {
    width: 28px;
    height: 28px;
    font-size: 16px;
  }
  
  .segment-btn {
    padding: 6px 4px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .bottom-bar {
    bottom: 12px;
    width: calc(100% - 24px);
    padding: 16px 20px;
    border-radius: 14px;
  }
  
  .controls-section {
    grid-template-columns: 1fr;
  }
  
  .control-group:first-child {
    grid-column: 1;
  }
}

/* 动画效果 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.bottom-bar {
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
</style>
