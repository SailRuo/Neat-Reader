<template>
  <div class="text-reflow-reader" :style="containerStyle" @click="$emit('click')">
    <div class="content-wrapper" :style="contentStyle">
      <div v-html="content" class="text-content"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  content: string
  theme: 'light' | 'sepia' | 'dark' | 'green'
  fontSize: number
  lineHeight: number
}>()

defineEmits<{
  click: []
}>()

const containerStyle = computed(() => {
  const themes = {
    light: { bg: '#ffffff', color: '#333333' },
    sepia: { bg: '#f4ecd8', color: '#5b4636' },
    dark: { bg: '#1a1a1a', color: '#d1d1d1' },
    green: { bg: '#e8f5e9', color: '#2c3e50' }
  }
  const theme = themes[props.theme] || themes.light
  return {
    backgroundColor: theme.bg,
    color: theme.color,
    height: '100%',
    width: '100%',
    overflowY: 'auto' as const,
    padding: '40px 20px',
    transition: 'all 0.3s ease'
  }
})

const contentStyle = computed(() => ({
  maxWidth: '800px',
  margin: '0 auto',
  fontSize: `${props.fontSize}px`,
  lineHeight: props.lineHeight,
  fontFamily: 'system-ui, -apple-system, sans-serif'
}))
</script>

<style scoped>
.text-reflow-reader {
  box-sizing: border-box;
}

.text-content {
  word-break: break-word;
  white-space: pre-wrap;
}

/* 针对解析出的 PDF 页面容器样式 */
:deep(.pdf-page-content) {
  margin-bottom: 2em;
}

:deep(hr) {
  border: 0;
  border-top: 1px solid currentColor;
  opacity: 0.2;
  margin: 2em 0;
}
</style>
