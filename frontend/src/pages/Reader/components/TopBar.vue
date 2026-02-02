<template>
  <div class="top-bar" :class="`theme-${theme}`">
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
      <button class="icon-btn" @click="$emit('toggle-sidebar', 'search')" title="搜索">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
      </button>
      <button class="icon-btn" @click="$emit('toggle-sidebar', 'contents')" title="目录">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
        </svg>
      </button>
      <button class="icon-btn" @click="$emit('toggle-sidebar', 'notes')" title="笔记">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
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
  'toggle-sidebar': [type: 'contents' | 'search' | 'notes']
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
  background: rgba(255, 255, 255, 0.98);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  z-index: 1000;
  transition: all 0.3s ease;
  color: #2c3e50;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.top-bar.theme-sepia {
  background: rgba(244, 236, 216, 0.98);
  color: #5b4636;
  border-bottom-color: rgba(91, 70, 54, 0.08);
}

.top-bar.theme-green {
  background: rgba(232, 245, 233, 0.98);
  color: #2d5a3d;
  border-bottom-color: rgba(45, 90, 61, 0.08);
}

.top-bar.theme-dark {
  background: rgba(26, 26, 26, 0.98);
  color: #e2e8f0;
  border-bottom-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
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
  background: rgba(0, 0, 0, 0.05);
  transform: scale(1.05);
}

.theme-dark .icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.theme-sepia .icon-btn:hover {
  background: rgba(91, 70, 54, 0.05);
}

.theme-green .icon-btn:hover {
  background: rgba(45, 90, 61, 0.05);
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
