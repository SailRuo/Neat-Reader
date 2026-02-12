<template>
  <div class="annotation-list">
    <!-- 头部统计 -->
    <div class="annotation-stats">
      <div class="stat-item">
        <span class="stat-label">总计</span>
        <span class="stat-value">{{ stats.total }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">高亮</span>
        <span class="stat-value highlight">{{ stats.highlights }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">笔记</span>
        <span class="stat-value note">{{ stats.notes }}</span>
      </div>
    </div>

    <!-- 注释列表 -->
    <div class="annotations-container">
      <div v-if="annotations.length === 0" class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <p>还没有任何注释</p>
        <p class="empty-hint">选中文本后点击高亮或笔记按钮</p>
      </div>

      <div
        v-for="annotation in sortedAnnotations"
        :key="annotation.id"
        class="annotation-item"
        :class="{ 'has-note': annotation.note }"
        @click="handleAnnotationClick(annotation)"
      >
        <!-- 颜色标记 -->
        <div class="annotation-marker" :style="{ backgroundColor: annotation.color }"></div>

        <!-- 内容 -->
        <div class="annotation-content">
          <!-- 文本 -->
          <div class="annotation-text">{{ annotation.text }}</div>

          <!-- 笔记 -->
          <div v-if="annotation.note" class="annotation-note">
            <svg class="note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span>{{ annotation.note }}</span>
          </div>

          <!-- 元信息 -->
          <div class="annotation-meta">
            <span v-if="annotation.chapterTitle" class="chapter-title">
              {{ annotation.chapterTitle }}
            </span>
            <span class="annotation-date">
              {{ formatDate(annotation.createdAt) }}
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="annotation-actions">
          <button
            v-if="annotation.type === 'note' || annotation.note"
            class="action-btn edit-btn"
            @click.stop="handleEdit(annotation)"
            title="编辑笔记"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            class="action-btn delete-btn"
            @click.stop="handleDelete(annotation)"
            title="删除"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { Annotation } from '../../../types/annotation'

// Props
const props = defineProps<{
  annotations: Annotation[]
  stats: {
    total: number
    highlights: number
    underlines: number
    notes: number
  }
}>()

// Emits
const emit = defineEmits<{
  'annotation-click': [annotation: Annotation]
  edit: [annotation: Annotation]
  delete: [annotation: Annotation]
}>()

// 按时间倒序排列
const sortedAnnotations = computed(() => {
  return [...props.annotations].sort((a, b) => b.createdAt - a.createdAt)
})

// 格式化日期
const formatDate = (timestamp: number) => {
  const date = dayjs(timestamp)
  const now = dayjs()
  
  if (date.isSame(now, 'day')) {
    return date.format('HH:mm')
  } else if (date.isSame(now, 'year')) {
    return date.format('MM-DD HH:mm')
  } else {
    return date.format('YYYY-MM-DD')
  }
}

// 点击注释
const handleAnnotationClick = (annotation: Annotation) => {
  emit('annotation-click', annotation)
}

// 编辑注释
const handleEdit = (annotation: Annotation) => {
  emit('edit', annotation)
}

// 删除注释
const handleDelete = (annotation: Annotation) => {
  emit('delete', annotation)
}
</script>

<style scoped>
.annotation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.annotation-stats {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #F8FAFC, #F1F5F9);
  border-bottom: 1px solid #E2E8F0;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-label {
  font-size: 11px;
  color: #64748B;
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1E293B;
}

.stat-value.highlight {
  color: #FBBF24;
}

.stat-value.note {
  color: #A78BFA;
}

.annotations-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.annotations-container::-webkit-scrollbar {
  width: 6px;
}

.annotations-container::-webkit-scrollbar-track {
  background: transparent;
}

.annotations-container::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 3px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #94A3B8;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 4px 0;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  color: #CBD5E1;
}

.annotation-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.annotation-item:hover {
  border-color: #4A90E2;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.1);
  transform: translateX(2px);
}

.annotation-item.has-note {
  border-left-width: 3px;
}

.annotation-marker {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
}

.annotation-content {
  flex: 1;
  min-width: 0;
}

.annotation-text {
  font-size: 13px;
  color: #1E293B;
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.annotation-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px;
  background: #F8FAFC;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
}

.note-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
  color: #A78BFA;
}

.annotation-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #94A3B8;
}

.chapter-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.annotation-date {
  flex-shrink: 0;
}

.annotation-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.annotation-item:hover .annotation-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid #E2E8F0;
  color: #64748B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

.action-btn:hover {
  background: #F8FAFC;
}

.edit-btn:hover {
  border-color: #A78BFA;
  color: #A78BFA;
  background: rgba(167, 139, 250, 0.1);
}

.delete-btn:hover {
  border-color: #EF4444;
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}
</style>
