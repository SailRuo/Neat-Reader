// EPUB Reader Composables
// 核心功能模块化，便于复用和测试

export { useEpubCore } from './useEpubCore'
export type { EpubCoreOptions, EpubCoreReturn } from './useEpubCore'

export { useReaderTheme, themeColors } from './useReaderTheme'
export type { ThemeColors, ReaderThemeOptions } from './useReaderTheme'

export { useReaderProgress } from './useReaderProgress'
export type { ProgressData, ChapterData } from './useReaderProgress'

export { useAnnotations } from './useAnnotations'
// export type { Note } from './useAnnotations'  // Note 类型不存在，已移除

export { usePageNavigation } from './usePageNavigation'
export type { PageNavigationOptions } from './usePageNavigation'

export { useTextSearch } from './useTextSearch'
export type { SearchResult } from './useTextSearch'

export { useTextToSpeech } from './useTextToSpeech'
export type { TTSOptions } from './useTextToSpeech'

// 自定义 EPUB 渲染引擎
export { useCustomEpubCore } from './useCustomEpubCore'
export type { Chapter, EpubMetadata, CustomEpubCoreOptions, CustomEpubCoreReturn } from './useCustomEpubCore'

export { useCustomPagination } from './useCustomPagination'
export type { CustomPaginationOptions, CustomPaginationReturn } from './useCustomPagination'
