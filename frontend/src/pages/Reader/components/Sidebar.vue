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
            <div class="chapter-title">{{ chapter.title || chapter.label }}</div>
          </div>
        </div>
        
        <!-- 搜索 -->
        <div v-else-if="type === 'search'" class="search-panel">
          <div class="search-box">
            <input
              v-model="localSearchQuery"
              placeholder="搜索全文..."
              @keyup.enter="handleSearch"
            />
            <button @click="handleSearch" :disabled="isSearching">
              {{ isSearching ? '搜索中...' : '搜索' }}
            </button>
          </div>
          
          <!-- 搜索结果 -->
          <div class="search-results">
            <div v-if="isSearching" class="search-loading">
              <span class="loading-spinner"></span>
              <span>正在搜索...</span>
            </div>
            
            <div v-else-if="searchResults.length === 0 && hasSearched" class="empty-tip">
              <p>未找到相关内容</p>
            </div>
            
            <div v-else-if="searchResults.length > 0" class="results-list">
              <div class="results-count">找到 {{ searchResults.length }} 个结果</div>
              <div
                v-for="(result, index) in searchResults"
                :key="index"
                :class="['result-item', { active: index === currentResultIndex }]"
                @click="goToSearchResult(index)"
              >
                <div class="result-chapter">{{ result.chapter || '未知章节' }}</div>
                <div class="result-excerpt" v-html="highlightKeyword(result.excerpt)"></div>
              </div>
            </div>
            
            <div v-else class="empty-tip">
              <p>输入关键词搜索全书内容</p>
            </div>
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
              @click="$emit('navigate', { cfi: note.cfi, chapterIndex: note.chapterIndex })"
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
              <div class="note-content" v-if="note.content">{{ note.content }}</div>
              <div class="note-time">{{ formatTime(note.timestamp) }}</div>
            </div>
          </div>
        </div>
        
        <!-- TTS 语音朗读 -->
        <div v-else-if="type === 'tts'" class="tts-panel">
          <!-- 朗读控制 -->
          <div class="tts-controls">
            <div class="control-buttons">
              <button 
                v-if="!ttsState.isPlaying" 
                @click="handleTTSPlay" 
                class="btn-primary"
                :disabled="!currentPageText || ttsState.isLoadingSegments"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {{ ttsState.isLoadingSegments ? '加载中...' : '朗读当前页' }}
              </button>
              
              <button 
                v-else-if="ttsState.isPaused" 
                @click="handleTTSResume" 
                class="btn-primary"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                继续
              </button>
              
              <button 
                v-else 
                @click="handleTTSPause" 
                class="btn-secondary"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
                暂停
              </button>
              
              <button 
                v-if="ttsState.isPlaying || ttsState.isPaused" 
                @click="handleTTSStop" 
                class="btn-danger"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M6 6h12v12H6z"/>
                </svg>
                停止
              </button>
            </div>
            
            <div v-if="ttsState.isLoadingSegments" class="tts-status">
              <div class="status-indicator">
                <span class="status-dot loading"></span>
                <span>正在加载音频片段...</span>
              </div>
            </div>
            
            <div v-else-if="ttsState.isPlaying || ttsState.isPaused" class="tts-status">
              <div class="status-indicator">
                <span class="status-dot" :class="{ playing: ttsState.isPlaying && !ttsState.isPaused }"></span>
                <span>{{ ttsState.isPaused ? '已暂停' : '正在朗读...' }}</span>
              </div>
              <div v-if="ttsState.totalSegments > 1" class="segment-progress">
                <span>片段 {{ ttsState.currentSegment }} / {{ ttsState.totalSegments }}</span>
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: (ttsState.currentSegment / ttsState.totalSegments * 100) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 设置面板 -->
          <div class="tts-settings-wrapper">
            <TTSSettings :tts="props.tts" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TTSSettings from '@/components/TTSSettings/index.vue'

const props = withDefaults(defineProps<{
  type: 'contents' | 'search' | 'notes' | 'tts'
  chapters?: any[]
  currentChapterIndex: number
  notes?: any[]
  theme: string
  // 搜索相关
  searchResults?: any[]
  isSearching?: boolean
  currentResultIndex?: number
  // TTS 相关
  currentPageText?: string
  tts?: any // TTS 实例从父组件传入
}>(), {
  chapters: () => [],
  notes: () => [],
  searchResults: () => [],
  isSearching: false,
  currentResultIndex: -1,
  currentPageText: ''
})

const emit = defineEmits<{
  close: []
  navigate: [data: any]
  'delete-note': [noteId: string]
  search: [query: string]
  'go-to-result': [index: number]
}>()

// TTS 功能 - 使用父组件传入的实例
const ttsState = computed(() => {
  if (!props.tts) {
    console.log('⚠️ [Sidebar] TTS 实例不存在')
    return {
      isPlaying: false,
      isPaused: false,
      isLoadingSegments: false,
      currentSegment: 0,
      totalSegments: 0
    }
  }
  
  console.log('✅ [Sidebar] TTS 状态:', {
    isPlaying: props.tts.isPlaying.value,
    isPaused: props.tts.isPaused.value,
    isLoadingSegments: props.tts.isLoadingSegments.value
  })
  
  return {
    isPlaying: props.tts.isPlaying.value,
    isPaused: props.tts.isPaused.value,
    isLoadingSegments: props.tts.isLoadingSegments.value,
    currentSegment: props.tts.currentSegmentIndex.value + 1,
    totalSegments: props.tts.segments.value.length
  }
})

// 本地状态
const localSearchQuery = ref('')
const hasSearched = ref(false)

// 检查 TTS 和 currentPageText
onMounted(() => {
  console.log('🔍 [Sidebar] 挂载时检查:')
  console.log('  - type:', props.type)
  console.log('  - tts 实例:', props.tts ? '存在' : '不存在')
  console.log('  - currentPageText 长度:', props.currentPageText?.length || 0)
  //console.log('  - currentPageText 前50字:', props.currentPageText?.substring(0, 50))
})

const title = computed(() => {
  const titles: Record<string, string> = {
    contents: '目录',
    search: '搜索',
    notes: '笔记',
    tts: '语音朗读'
  }
  return titles[props.type]
})

// TTS 控制
const handleTTSPlay = () => {
  console.log('🎯 [Sidebar] 点击朗读按钮')
  console.log('🎯 [Sidebar] currentPageText 长度:', props.currentPageText?.length)
  console.log('🎯 [Sidebar] currentPageText 前50字:', props.currentPageText?.substring(0, 50))
  console.log('🎯 [Sidebar] tts 实例:', props.tts)
  console.log('🎯 [Sidebar] tts.speak 方法:', props.tts?.speak)
  console.log('🎯 [Sidebar] tts.isPlaying:', props.tts?.isPlaying?.value)
  
  if (!props.tts) {
    console.error('❌ [Sidebar] TTS 实例不存在')
    alert('TTS 实例未初始化，请刷新页面重试')
    return
  }
  
  if (!props.currentPageText) {
    console.error('❌ [Sidebar] 当前页面文本为空')
    alert('无法获取当前页面文本，请确保书籍已加载')
    return
  }
  
  console.log('✅ [Sidebar] 开始调用 speak 方法')
  try {
    props.tts.speak(props.currentPageText)
    console.log('✅ [Sidebar] speak 方法调用成功')
  } catch (error) {
    console.error('❌ [Sidebar] speak 方法调用失败:', error)
    alert('朗读失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

const handleTTSPause = () => {
  console.log('🎯 [TTS] 点击暂停按钮')
  if (props.tts) {
    props.tts.pause()
  }
}

const handleTTSResume = () => {
  console.log('🎯 [TTS] 点击继续按钮')
  if (props.tts) {
    props.tts.resume()
  }
}

const handleTTSStop = () => {
  console.log('🎯 [TTS] 点击停止按钮')
  if (props.tts) {
    props.tts.stop()
  }
}

// 搜索
const handleSearch = () => {
  if (!localSearchQuery.value.trim()) return
  hasSearched.value = true
  emit('search', localSearchQuery.value.trim())
}

// 跳转到搜索结果
const goToSearchResult = (index: number) => {
  emit('go-to-result', index)
}

// 高亮关键词
const highlightKeyword = (text: string) => {
  if (!localSearchQuery.value) return text
  const regex = new RegExp(`(${localSearchQuery.value})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// 格式化时间
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
  width: 380px;
  height: 100%;
  background: var(--reader-bg, white);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px var(--reader-shadow, rgba(0, 0, 0, 0.1));
  transition: all 0.3s ease;
  color: var(--reader-text, #2c3e50);
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--reader-border, rgba(0, 0, 0, 0.1));
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
  color: var(--reader-text, inherit);
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: var(--reader-hover, rgba(0, 0, 0, 0.05));
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 目录样式 */
.chapter-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: background 0.2s ease;
}

.chapter-item:hover {
  background: var(--reader-hover, rgba(0, 0, 0, 0.05));
}

.chapter-item.active {
  background: var(--reader-accent-light, rgba(74, 144, 226, 0.1));
  color: var(--reader-accent, #4a90e2);
}

.chapter-title {
  font-size: 14px;
}

/* 搜索样式 */
.search-box {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.search-box input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--reader-border, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  outline: none;
  background: var(--reader-bg, white);
  color: var(--reader-text, inherit);
  font-size: 14px;
}

.search-box input:focus {
  border-color: var(--reader-accent, #4a90e2);
}

.search-box button {
  padding: 10px 20px;
  border: none;
  background: var(--reader-accent, #4a90e2);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.search-box button:hover:not(:disabled) {
  background: var(--reader-accent-hover, #357abd);
}

.search-box button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: var(--reader-text-muted, #666);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--reader-border, rgba(0, 0, 0, 0.1));
  border-top-color: var(--reader-accent, #4a90e2);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.results-count {
  font-size: 13px;
  color: var(--reader-text-muted, #666);
  margin-bottom: 12px;
}

.result-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  background: var(--reader-hover, rgba(0, 0, 0, 0.02));
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.result-item:hover {
  background: var(--reader-active, rgba(0, 0, 0, 0.05));
  border-color: var(--reader-border, rgba(0, 0, 0, 0.1));
}

.result-item.active {
  border-color: var(--reader-accent, #4a90e2);
  background: var(--reader-accent-light, rgba(74, 144, 226, 0.1));
}

.result-chapter {
  font-size: 12px;
  color: var(--reader-accent, #4a90e2);
  margin-bottom: 4px;
}

.result-excerpt {
  font-size: 13px;
  line-height: 1.5;
  color: var(--reader-text, inherit);
}

.result-excerpt :deep(mark) {
  background: #fff3cd;
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

/* 笔记样式 */
.empty-tip {
  text-align: center;
  padding: 40px 20px;
  color: var(--reader-text-muted, #666);
}

.empty-sub {
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.7;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-item {
  padding: 16px;
  background: var(--reader-hover, rgba(0, 0, 0, 0.03));
  border-radius: 12px;
  border: 1px solid var(--reader-border, rgba(0, 0, 0, 0.05));
  transition: all 0.2s ease;
  cursor: pointer;
}

.note-item:hover {
  background: var(--reader-active, rgba(0, 0, 0, 0.05));
  border-color: var(--reader-border, rgba(0, 0, 0, 0.1));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--reader-shadow, rgba(0, 0, 0, 0.1));
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.note-chapter {
  font-size: 12px;
  color: var(--reader-accent, #4a90e2);
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

/* TTS 样式 */
.tts-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tts-controls {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tts-player {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.tts-btn {
  width: 48px;
  height: 48px;
  border: none;
  background: var(--reader-hover, rgba(0, 0, 0, 0.05));
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--reader-text, inherit);
  transition: all 0.2s ease;
}

.tts-btn:hover {
  background: var(--reader-active, rgba(0, 0, 0, 0.08));
  transform: scale(1.05);
}

.tts-btn-main {
  width: 64px;
  height: 64px;
  background: var(--reader-accent, #4a90e2);
  color: white;
}

.tts-btn-main:hover {
  background: var(--reader-accent-hover, #357abd);
}

.tts-btn-main.playing {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(74, 144, 226, 0); }
}

.tts-setting {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tts-setting label {
  font-size: 13px;
  color: var(--reader-text-muted, #666);
}

.tts-slider {
  width: 100%;
  height: 4px;
  appearance: none;
  background: var(--reader-border, rgba(0, 0, 0, 0.1));
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.tts-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--reader-accent, #4a90e2);
  cursor: pointer;
  border: 2px solid var(--reader-bg, white);
  box-shadow: 0 1px 4px var(--reader-shadow, rgba(0, 0, 0, 0.2));
}

.tts-select {
  padding: 10px 14px;
  border: 1px solid var(--reader-border, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  background: var(--reader-bg, white);
  color: var(--reader-text, inherit);
  font-size: 14px;
  outline: none;
  cursor: pointer;
}

.tts-select:focus {
  border-color: var(--reader-accent, #4a90e2);
}

.tts-hint {
  text-align: center;
  padding: 16px;
  background: var(--reader-hover, rgba(0, 0, 0, 0.02));
  border-radius: 8px;
  font-size: 13px;
  color: var(--reader-text-muted, #666);
}

/* TTS 控制面板样式 */
.tts-controls {
  padding: 20px;
  border-bottom: 1px solid var(--reader-border, rgba(0, 0, 0, 0.08));
}

.control-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.control-buttons button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4a90e2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3a80d2;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(74, 144, 226, 0.3);
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.tts-status {
  padding: 12px;
  background: var(--reader-hover, rgba(0, 0, 0, 0.02));
  border-radius: 8px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--reader-text-muted, #666);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
}

.status-dot.playing {
  background: #4CAF50;
  animation: pulse 2s ease-in-out infinite;
}

.status-dot.loading {
  background: #2196F3;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.segment-progress {
  margin-top: 8px;
  font-size: 12px;
  color: var(--reader-text-muted, #666);
}

.progress-bar {
  margin-top: 4px;
  height: 4px;
  background: var(--reader-hover, rgba(0, 0, 0, 0.1));
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
}

.tts-settings-wrapper {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
  }
}
</style>
