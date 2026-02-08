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
      <button class="icon-btn" @click="$emit('toggle-sidebar', 'tts')" title="语音朗读">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      </button>
      <button class="icon-btn" @click="$emit('toggle-sidebar', 'search')" title="搜索">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
      </button>
      <button class="icon-btn" @click="$emit('toggle-sidebar', 'notes')" title="笔记">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </button>
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
  'toggle-sidebar': [type: 'contents' | 'search' | 'notes' | 'tts']
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
