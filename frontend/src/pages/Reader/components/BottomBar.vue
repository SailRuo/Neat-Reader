<template>
  <div class="bottom-bar-container" :class="`theme-${theme}`" @click.stop>
    <!-- 进度控制 (一级) -->
    <div class="section progress-section">
      <div class="slider-container">
        <input 
          type="range" 
          min="0" 
          max="100" 
          :value="progress"
          class="progress-slider"
          @input="handleSliderChange"
        >
      </div>
      <div class="progress-info">
        <span class="progress-percentage">{{ progress }}%</span>
      </div>
    </div>

    <!-- 快捷设置 (一级平铺) -->
    <div class="section quick-settings">
      <!-- 主题选择 -->
      <div class="setting-group">
        <div class="theme-grid">
          <button
            v-for="t in themes"
            :key="t.value"
            :class="['theme-swatch', t.value, { active: theme === t.value }]"
            @click="$emit('update:theme', t.value)"
            :title="t.label"
          >
            <div class="swatch-color" :style="{ background: t.color }"></div>
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 字号调节 -->
      <div class="setting-group">
        <div class="stepper">
          <button class="stepper-btn" @click="$emit('update:fontSize', fontSize - 1)" :disabled="fontSize <= 12">A-</button>
          <span class="value">{{ fontSize }}</span>
          <button class="stepper-btn" @click="$emit('update:fontSize', fontSize + 1)" :disabled="fontSize >= 30">A+</button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 行高调节 -->
      <div class="setting-group">
        <div class="segment-control">
          <button 
            v-for="h in lineHeights" 
            :key="h" 
            :class="{ active: lineHeight === h }"
            @click="$emit('update:lineHeight', h)"
          >{{ h }}</button>
        </div>
      </div>

      <!-- PDF 模式切换 -->
      <template v-if="format === 'pdf'">
        <div class="divider"></div>
        <div class="setting-group">
          <button class="mode-toggle-btn" :class="{ active: isPdfTextMode }" @click="$emit('toggle-pdf-text-mode')" :disabled="isParsingPdf">
            <i class="icon-reflow"></i>
            <span>{{ isParsingPdf ? '解析中' : (isPdfTextMode ? '原生' : '重排') }}</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  progress: number
  currentPage: number
  totalPages: number
  theme: string
  fontSize: number
  lineHeight: number
  isPdfTextMode: boolean
  isParsingPdf: boolean
  format?: string
}>()

const emit = defineEmits<{
  'update:progress': [value: number]
  'update:theme': [value: string]
  'update:fontSize': [value: number]
  'update:lineHeight': [value: number]
  'toggle-pdf-text-mode': []
}>()

const themes = [
  { value: 'light', label: '简约', color: '#ffffff' },
  { value: 'sepia', label: '羊皮纸', color: '#f4ecd8' },
  { value: 'green', label: '护眼', color: '#e8f5e9' },
  { value: 'dark', label: '深夜', color: '#1a1a1a' }
]

const lineHeights = [1.2, 1.5, 1.8, 2.0]

const handleSliderChange = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value)
  emit('update:progress', val)
}
</script>

<style scoped>
.bottom-bar-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: fit-content;
  min-width: 520px;
  max-width: calc(100vw - 48px);
  background: rgba(var(--bg-rgb, 255, 255, 255), 0.95);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 24px;
  padding: 18px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 主题变量 */
.theme-dark { --bg-rgb: 26, 26, 26; --text-color: #eee; --accent: #D4AF37; border-color: rgba(255, 255, 255, 0.1); }
.theme-light { --bg-rgb: 255, 255, 255; --text-color: #333; --accent: #4a90e2; }
.theme-sepia { --bg-rgb: 244, 236, 216; --text-color: #3d2817; --accent: #8b6914; }
.theme-green { --bg-rgb: 232, 245, 233; --text-color: #1b4d2e; --accent: #2e7d32; }

.section {
  display: flex;
  align-items: center;
}

/* 进度条样式 */
.progress-section {
  gap: 16px;
  padding: 0 6px;
}

.slider-container {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.progress-slider {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 3px;
  appearance: none;
  outline: none;
  cursor: pointer;
  transition: height 0.2s;
}

.progress-slider:hover {
  height: 8px;
}

.theme-dark .progress-slider { background: rgba(255, 255, 255, 0.12); }

.progress-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: grab;
}

.progress-slider:hover::-webkit-slider-thumb {
  transform: scale(1.1);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
}

.progress-slider:active::-webkit-slider-thumb { 
  transform: scale(1.15);
  cursor: grabbing;
}

.progress-info {
  min-width: 48px;
  text-align: right;
}

.progress-percentage {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
  opacity: 0.75;
}

/* 设置行平铺样式 */
.quick-settings {
  justify-content: space-between;
  gap: 20px;
  padding: 2px 0;
}

.setting-group {
  display: flex;
  align-items: center;
}

.divider {
  width: 1px;
  height: 28px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 1px;
}

.theme-dark .divider { background: rgba(255, 255, 255, 0.1); }

/* 主题按钮 */
.theme-grid {
  display: flex;
  gap: 10px;
}

.theme-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  padding: 3px;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-swatch:hover {
  transform: scale(1.05);
}

.swatch-color {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.theme-swatch.active { 
  border-color: var(--accent); 
  transform: scale(1.12);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb, 74, 144, 226), 0.15);
}

/* 步进器 */
.stepper {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 10px;
}

.theme-dark .stepper { background: rgba(255, 255, 255, 0.08); }

.stepper-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--text-color);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.stepper-btn:hover:not(:disabled) { 
  background: rgba(0, 0, 0, 0.08);
  transform: scale(1.05);
}

.stepper-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper .value { 
  font-size: 14px; 
  font-weight: 600; 
  min-width: 32px; 
  text-align: center; 
  color: var(--text-color);
  opacity: 0.9;
}

/* 分段控制 */
.segment-control {
  display: flex;
  gap: 3px;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 10px;
}

.theme-dark .segment-control { background: rgba(255, 255, 255, 0.08); }

.segment-control button {
  padding: 6px 14px;
  border: none;
  background: none;
  color: var(--text-color);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.7;
}

.segment-control button:hover:not(.active) {
  background: rgba(0, 0, 0, 0.04);
  opacity: 0.9;
}

.segment-control button.active { 
  background: var(--accent); 
  color: white;
  opacity: 1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* PDF 切换 */
.mode-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-color);
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.mode-toggle-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.mode-toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.theme-dark .mode-toggle-btn { background: rgba(255, 255, 255, 0.08); }
.mode-toggle-btn.active { 
  color: var(--accent);
  background: rgba(var(--accent-rgb, 74, 144, 226), 0.12);
}

/* 图标 */
[class^="icon-"] {
  width: 16px;
  height: 16px;
  background: currentColor;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}
.icon-reflow { 
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6h16'/%3E%3Cpath d='M4 12h10'/%3E%3Cpath d='M4 18h16'/%3E%3C/svg%3E"); 
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 6h16'/%3E%3Cpath d='M4 12h10'/%3E%3Cpath d='M4 18h16'/%3E%3C/svg%3E");
}

@media (max-width: 600px) {
  .bottom-bar-container { 
    min-width: auto; 
    width: calc(100% - 32px);
    padding: 16px 20px;
    gap: 14px;
  }
  .quick-settings { 
    flex-wrap: wrap; 
    justify-content: center;
    gap: 16px;
  }
  .theme-swatch {
    width: 28px;
    height: 28px;
  }
}
</style>
