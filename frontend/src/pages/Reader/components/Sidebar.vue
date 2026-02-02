<template>
  <div class="sidebar-overlay" @click="$emit('close')">
    <div class="sidebar" :class="`theme-${theme}`" @click.stop>
      <div class="sidebar-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      
      <div class="sidebar-content">
        <!-- 目录 -->
        <div v-if="type === 'contents'" class="contents-panel">
          <div
            v-for="(chapter, index) in chapters"
            :key="index"
            :class="['chapter-item', { active: index === currentChapterIndex }]"
            @click="$emit('navigate', { index })"
          >
            <div class="chapter-title">{{ chapter.title }}</div>
          </div>
        </div>
        
        <!-- 搜索 -->
        <div v-else-if="type === 'search'" class="search-panel">
          <div class="search-box">
            <input
              v-model="searchQuery"
              placeholder="搜索全文..."
              @keyup.enter="handleSearch"
            />
            <button @click="handleSearch">搜索</button>
          </div>
          <div class="search-results">
            <p class="empty-tip">搜索功能开发中...</p>
          </div>
        </div>
        
        <!-- 笔记 -->
        <div v-else-if="type === 'notes'" class="notes-panel">
          <div v-if="!notes || notes.length === 0" class="empty-tip">
            <p>还没有笔记</p>
            <p class="empty-sub">选中文本后即可添加笔记</p>
          </div>
          <div v-else class="notes-list">
            <div
              v-for="note in notes"
              :key="note.id"
              class="note-item"
              @click="$emit('navigate', { cfi: note.cfi })"
            >
              <div class="note-header">
                <span class="note-chapter">{{ note.chapter }}</span>
                <button 
                  class="delete-btn" 
                  @click.stop="$emit('delete-note', note.id)" 
                  title="删除"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
              <div class="note-text" :style="{ 
                backgroundColor: note.color + '33', 
                borderLeftColor: note.color 
              }">{{ note.text }}</div>
              <div class="note-content">{{ note.content }}</div>
              <div class="note-time">{{ formatTime(note.timestamp) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  type: 'contents' | 'search' | 'notes'
  chapters: any[]
  currentChapterIndex: number
  notes?: any[]
  theme: string
}>()

const emit = defineEmits<{
  close: []
  navigate: [data: any]
  'delete-note': [noteId: string]
}>()

const searchQuery = ref('')

const title = computed(() => {
  const titles = {
    contents: '目录',
    search: '搜索',
    notes: '笔记'
  }
  return titles[props.type]
})

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString()
}

const handleSearch = () => {
  console.log('搜索:', searchQuery.value)
}
</script>

<style scoped>
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}

.sidebar {
  width: 360px;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  color: #2c3e50;
}

.sidebar.theme-sepia {
  background: #f4ecd8;
  color: #5b4636;
}

.sidebar.theme-green {
  background: #e8f5e9;
  color: #2d5a3d;
}

.sidebar.theme-dark {
  background: #1a1a1a;
  color: #e2e8f0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.theme-dark .sidebar-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.theme-sepia .sidebar-header {
  border-bottom-color: rgba(91, 70, 54, 0.1);
}

.theme-green .sidebar-header {
  border-bottom-color: rgba(45, 90, 61, 0.1);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.theme-dark .close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.theme-sepia .close-btn:hover {
  background: rgba(91, 70, 54, 0.05);
}

.theme-green .close-btn:hover {
  background: rgba(45, 90, 61, 0.05);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.chapter-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: background 0.2s ease;
}

.chapter-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.theme-dark .chapter-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.theme-sepia .chapter-item:hover {
  background: rgba(91, 70, 54, 0.05);
}

.theme-green .chapter-item:hover {
  background: rgba(45, 90, 61, 0.05);
}

.chapter-item.active {
  background: rgba(74, 144, 226, 0.1);
  color: #4a90e2;
}

.chapter-title {
  font-size: 14px;
}

.search-box {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.search-box input {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  outline: none;
}

.search-box button {
  padding: 10px 20px;
  border: none;
  background: #4a90e2;
  color: white;
  border-radius: 8px;
  cursor: pointer;
}

.empty-tip {
  text-align: center;
  padding: 40px 20px;
  opacity: 0.5;
}

.empty-sub {
  font-size: 12px;
  margin-top: 8px;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-item {
  padding: 16px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  cursor: pointer;
}

.note-item:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.theme-dark .note-item {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.05);
}

.theme-dark .note-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-sepia .note-item {
  background: rgba(91, 70, 54, 0.03);
  border-color: rgba(91, 70, 54, 0.05);
}

.theme-sepia .note-item:hover {
  background: rgba(91, 70, 54, 0.05);
  border-color: rgba(91, 70, 54, 0.1);
}

.theme-green .note-item {
  background: rgba(45, 90, 61, 0.03);
  border-color: rgba(45, 90, 61, 0.05);
}

.theme-green .note-item:hover {
  background: rgba(45, 90, 61, 0.05);
  border-color: rgba(45, 90, 61, 0.1);
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.note-chapter {
  font-size: 12px;
  color: #4a90e2;
  font-weight: 600;
}

.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: #ff4444;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.delete-btn:hover {
  background: rgba(255, 68, 68, 0.1);
}

.note-text {
  font-size: 13px;
  padding: 8px 12px;
  background: rgba(74, 144, 226, 0.1);
  border-left: 2px solid #4a90e2;
  border-radius: 4px;
  margin-bottom: 8px;
  font-style: italic;
  line-height: 1.5;
}

.note-content {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 8px;
}

.note-time {
  font-size: 11px;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
  }
}
</style>
