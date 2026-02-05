<template>
  <div class="bottom-bar" :class="`theme-${theme}`">
    <div class="progress-section">
      <div class="progress-header">
        <span>阅读进度</span>
        <span class="progress-value">{{ progress }}%</span>
      </div>
      <input
        type="range"
        :value="progress"
        min="0"
        max="100"
        @input="handleProgressInput"
        @change="handleProgressChange"
        class="progress-slider"
      />
      <div class="progress-info">
        <span v-if="currentPage && totalPages">第 {{ currentPage }} / {{ totalPages }} 页</span>
      </div>
    </div>
    
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
      
      <!-- 模式 -->
      <div class="control-group">
        <label>模式</label>
        <div class="mode-options">
          <button
            :class="['mode-btn', { active: pageMode === 'page' }]"
            @click="$emit('update:pageMode', 'page')"
          >
            翻页
          </button>
          <button
            :class="['mode-btn', { active: pageMode === 'scroll' }]"
            @click="$emit('update:pageMode', 'scroll')"
          >
            滚动
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
  pageMode: string
  alignment: string
}>()

const emit = defineEmits<{
  'update:progress': [value: number]
  'update:theme': [value: string]
  'update:fontSize': [value: number]
  'update:lineHeight': [value: number]
  'update:pageMode': [value: 'page' | 'scroll']
  'update:alignment': [value: string]
}>()

const themes = [
  { value: 'light', label: '明亮', color: '#ffffff' },
  { value: 'sepia', label: '护眼', color: '#f4ecd8' },
  { value: 'green', label: '护眼绿', color: '#e8f5e9' },
  { value: 'dark', label: '夜晚', color: '#1a1a1a' }
]

const lineHeights = [1.2, 1.5, 1.8, 2.0]

const tempProgress = ref(props.progress)

const handleProgressInput = (e: Event) => {
  tempProgress.value = parseInt((e.target as HTMLInputElement).value)
}

const handleProgressChange = () => {
  emit('update:progress', tempProgress.value)
}
</script>

<style scoped>
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.98);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.3s ease;
  color: #2c3e50;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.bottom-bar.theme-sepia {
  background: rgba(244, 236, 216, 0.98);
  color: #5b4636;
  border-top-color: rgba(91, 70, 54, 0.08);
}

.bottom-bar.theme-green {
  background: rgba(232, 245, 233, 0.98);
  color: #2d5a3d;
  border-top-color: rgba(45, 90, 61, 0.08);
}

.bottom-bar.theme-dark {
  background: rgba(26, 26, 26, 0.98);
  color: #e2e8f0;
  border-top-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  opacity: 0.8;
}

.progress-value {
  color: #4a90e2;
  font-weight: 600;
}

.progress-slider {
  width: 100%;
  height: 4px;
  appearance: none;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.theme-dark .progress-slider {
  background: rgba(255, 255, 255, 0.08);
}

.theme-sepia .progress-slider {
  background: rgba(91, 70, 54, 0.08);
}

.theme-green .progress-slider {
  background: rgba(45, 90, 61, 0.08);
}

.progress-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4a90e2;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(74, 144, 226, 0.4);
  transition: transform 0.2s ease;
}

.progress-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.theme-dark .progress-slider::-webkit-slider-thumb {
  border-color: #1a1a1a;
}

.theme-sepia .progress-slider::-webkit-slider-thumb {
  border-color: #f4ecd8;
}

.theme-green .progress-slider::-webkit-slider-thumb {
  border-color: #e8f5e9;
}

.progress-info {
  font-size: 11px;
  opacity: 0.6;
  text-align: center;
}

.controls-section {
  display: grid;
  grid-template-columns: auto repeat(3, minmax(0, 1fr));
  gap: 16px;
  padding: 0 8px;
  align-items: start;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.control-group:first-child {
  min-width: 160px;
}

.control-group label {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.7;
}

.theme-options {
  display: flex;
  gap: 6px;
}

.theme-btn {
  width: 36px;
  height: 36px;
  border: 2px solid transparent;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  padding: 3px;
  transition: all 0.2s ease;
}

.theme-btn:hover {
  transform: scale(1.05);
}

.theme-btn.active {
  border-color: #4a90e2;
  box-shadow: 0 0 0 1px rgba(74, 144, 226, 0.2);
}

.theme-preview {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.theme-dark .theme-preview {
  border-color: rgba(255, 255, 255, 0.2);
}

.stepper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  padding: 6px;
}

.theme-dark .stepper {
  background: rgba(255, 255, 255, 0.04);
}

.theme-sepia .stepper {
  background: rgba(91, 70, 54, 0.04);
}

.theme-green .stepper {
  background: rgba(45, 90, 61, 0.04);
}

.stepper button {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-dark .stepper button {
  background: rgba(255, 255, 255, 0.06);
}

.theme-sepia .stepper button {
  background: rgba(91, 70, 54, 0.06);
}

.theme-green .stepper button {
  background: rgba(45, 90, 61, 0.06);
}

.stepper button:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(1.05);
}

.theme-dark .stepper button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.theme-sepia .stepper button:hover:not(:disabled) {
  background: rgba(91, 70, 54, 0.1);
}

.theme-green .stepper button:hover:not(:disabled) {
  background: rgba(45, 90, 61, 0.1);
}

.stepper button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper span {
  flex: 1;
  text-align: center;
  font-weight: 500;
  font-size: 13px;
}

.segment-options {
  display: flex;
  gap: 3px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  padding: 3px;
}

.theme-dark .segment-options {
  background: rgba(255, 255, 255, 0.04);
}

.theme-sepia .segment-options {
  background: rgba(91, 70, 54, 0.04);
}

.theme-green .segment-options {
  background: rgba(45, 90, 61, 0.04);
}

.segment-btn {
  flex: 1;
  padding: 6px 4px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  color: inherit;
  font-weight: 500;
  min-width: 0;
  white-space: nowrap;
}

.segment-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.theme-dark .segment-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.segment-btn.active {
  background: #4a90e2;
  color: white;
  box-shadow: 0 1px 3px rgba(74, 144, 226, 0.3);
}

.mode-options {
  display: flex;
  gap: 6px;
}

.mode-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
  color: inherit;
  font-weight: 500;
}

.mode-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.12);
}

.theme-dark .mode-btn {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.theme-dark .mode-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
}

.theme-sepia .mode-btn {
  border-color: rgba(91, 70, 54, 0.08);
  background: rgba(91, 70, 54, 0.02);
}

.theme-sepia .mode-btn:hover {
  background: rgba(91, 70, 54, 0.04);
  border-color: rgba(91, 70, 54, 0.12);
}

.theme-green .mode-btn {
  border-color: rgba(45, 90, 61, 0.08);
  background: rgba(45, 90, 61, 0.02);
}

.theme-green .mode-btn:hover {
  background: rgba(45, 90, 61, 0.04);
  border-color: rgba(45, 90, 61, 0.12);
}

.mode-btn.active {
  background: #4a90e2;
  color: white;
  border-color: #4a90e2;
  box-shadow: 0 1px 3px rgba(74, 144, 226, 0.3);
}

@media (max-width: 768px) {
  .controls-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .control-group:first-child {
    grid-column: 1 / -1;
  }
  
  .bottom-bar {
    padding: 12px 16px;
  }
}
</style>
