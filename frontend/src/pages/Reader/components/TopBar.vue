<template>
  <div class="top-bar" :class="`theme-${theme}`" @click.stop>
    <div class="left-section">
      <button class="icon-btn" @click="$emit('back')" title="返回">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>
      <div class="book-info">
        <div class="book-title">{{ book?.title || '未知书籍' }}</div>
        <div class="book-meta">
          <span class="chapter">{{ chapterTitle }}</span>
        </div>
      </div>
    </div>
    
    <div class="right-section">
      <button class="icon-btn" @click="$emit('toggle-sidebar', 'contents')" title="目录">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  book: any
  chapterTitle: string
  theme: string
}>()

defineEmits<{
  back: []
  'toggle-sidebar': [type: 'contents']
}>()
</script>

<style scoped>
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--reader-backdrop, rgba(255, 255, 255, 0.98));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--reader-border, rgba(0, 0, 0, 0.08));
  z-index: 1000;
  transition: all 0.3s ease;
  color: var(--reader-text, #2c3e50);
  box-shadow: 0 2px 10px var(--reader-shadow, rgba(0, 0, 0, 0.05));
}

/* 主题兼容（保留向后兼容） */
.top-bar.theme-sepia {
  --reader-backdrop: rgba(244, 236, 216, 0.98);
  --reader-text: #5b4636;
  --reader-border: rgba(91, 70, 54, 0.08);
}

.top-bar.theme-green {
  --reader-backdrop: rgba(232, 245, 233, 0.98);
  --reader-text: #2d5a3d;
  --reader-border: rgba(45, 90, 61, 0.08);
}

.top-bar.theme-dark {
  --reader-backdrop: rgba(26, 26, 26, 0.98);
  --reader-text: #e2e8f0;
  --reader-border: rgba(255, 255, 255, 0.08);
  --reader-shadow: rgba(0, 0, 0, 0.3);
}

.left-section,
.right-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--reader-hover, rgba(0, 0, 0, 0.05));
  transform: scale(1.05);
}

.book-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 4px;
}

.book-title {
  font-size: 15px;
  font-weight: 600;
  color: inherit;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  opacity: 0.6;
}

.chapter {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
