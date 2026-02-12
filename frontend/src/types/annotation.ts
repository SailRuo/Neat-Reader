// 注释类型定义

export type AnnotationType = 'highlight' | 'underline' | 'note'

export interface Annotation {
  id: string
  bookId: string
  cfi: string              // EPUB CFI 位置
  range?: string           // 备用位置信息（JSON 字符串）
  text: string             // 选中的文本
  note?: string            // 用户笔记
  color: string            // 高亮颜色
  type: AnnotationType
  chapterIndex: number     // 章节索引
  chapterTitle?: string    // 章节标题
  createdAt: number
  updatedAt: number
}

export interface AnnotationColor {
  name: string
  value: string
  light: string  // 浅色版本用于高亮
}

// 预设颜色
export const ANNOTATION_COLORS: AnnotationColor[] = [
  { name: '黄色', value: '#FBBF24', light: 'rgba(251, 191, 36, 0.3)' },
  { name: '绿色', value: '#34D399', light: 'rgba(52, 211, 153, 0.3)' },
  { name: '蓝色', value: '#60A5FA', light: 'rgba(96, 165, 250, 0.3)' },
  { name: '紫色', value: '#A78BFA', light: 'rgba(167, 139, 250, 0.3)' },
  { name: '粉色', value: '#F472B6', light: 'rgba(244, 114, 182, 0.3)' },
  { name: '红色', value: '#F87171', light: 'rgba(248, 113, 113, 0.3)' },
]

// 默认颜色
export const DEFAULT_ANNOTATION_COLOR = ANNOTATION_COLORS[0]
