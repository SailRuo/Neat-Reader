import { ref, Ref, computed } from 'vue'
import { Book, Rendition } from 'epubjs'

export interface ProgressData {
    progress: number
    currentPage: number
    totalPages: number
}

export interface ChapterData {
    index: number
    title: string
}

export function useReaderProgress(
    book: Ref<Book | null>,
    rendition: Ref<Rendition | null>,
    isReady: Ref<boolean>
) {
    const progress = ref(0)
    const currentPage = ref(1)
    const totalPages = ref(1)
    const currentChapterIndex = ref(0)
    const currentChapterTitle = ref('')

    // 绑定位置变化事件
    const bindLocationEvents = (
        onProgressChange?: (data: ProgressData) => void,
        onChapterChange?: (data: ChapterData) => void
    ) => {
        if (!rendition.value) return

            ; (rendition.value as any).on('relocated', (location: any) => {
                if (!location || !location.start) return

                console.log('📍 [Relocated] 位置更新事件触发')
                console.log('  - CFI:', location.start.cfi)
                console.log('  - Href:', location.start.href)
                console.log('  - Displayed:', location.start.displayed)

                // 计算进度
                let newProgress = 0
                if (isReady.value && book.value && (book.value as any).locations?.length() > 0) {
                    try {
                        const totalLocations = (book.value as any).locations.length()
                        newProgress = Math.floor(
                            (book.value as any).locations.percentageFromCfi(location.start.cfi) * 100
                        )
                        console.log('  - 总位置数:', totalLocations)
                        console.log('  - 计算进度:', newProgress, '%')
                    } catch (error) {
                        console.warn('  - 进度计算失败，使用备用方法')
                        // 备用：使用 spine 索引
                        const spineIndex = (book.value as any).spine.items.findIndex(
                            (item: any) => item.href === location.start.href || location.start.href.includes(item.href)
                        )
                        if (spineIndex !== -1) {
                            const spineLength = (book.value as any).spine.length
                            newProgress = Math.floor((spineIndex / spineLength) * 100)
                            console.log('  - Spine 索引:', spineIndex, '/', spineLength)
                            console.log('  - 备用进度:', newProgress, '%')
                        }
                    }
                }

                const oldProgress = progress.value
                progress.value = newProgress
                currentPage.value = location.start.displayed?.page || 1
                totalPages.value = location.start.displayed?.total || 1

                if (Math.abs(newProgress - oldProgress) > 5) {
                    console.warn('⚠️ [Progress Jump] 进度跳跃过大!')
                    console.warn('  - 旧进度:', oldProgress, '%')
                    console.warn('  - 新进度:', newProgress, '%')
                    console.warn('  - 跳跃幅度:', Math.abs(newProgress - oldProgress), '%')
                }

                console.log('  - 当前页:', currentPage.value, '/', totalPages.value)

                onProgressChange?.({
                    progress: progress.value,
                    currentPage: currentPage.value,
                    totalPages: totalPages.value
                })

                // 更新章节信息
                const href = location.start.href
                if (href && book.value && (book.value as any).navigation) {
                    const chapterInfo = findChapter(href)
                    if (chapterInfo) {
                        if (currentChapterIndex.value !== chapterInfo.index) {
                            console.log('📑 [Chapter Change] 章节切换:', chapterInfo.title, 'Index:', chapterInfo.index)
                        }
                        currentChapterIndex.value = chapterInfo.index
                        currentChapterTitle.value = chapterInfo.title
                        onChapterChange?.(chapterInfo)
                    }
                }
            })
    }

    // 查找章节
    const findChapter = (href: string): ChapterData | null => {
        if (!book.value) return null

        const toc = (book.value as any).navigation?.toc || []
        let foundChapter: any = null
        let foundIndex = -1

        const search = (items: any[], parentIndex = 0): boolean => {
            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                if (item.href && (href.includes(item.href) || item.href.includes(href.split('#')[0]))) {
                    foundChapter = item
                    foundIndex = parentIndex + i
                    return true
                }
                if (item.subitems?.length > 0) {
                    if (search(item.subitems, parentIndex + i)) return true
                }
            }
            return false
        }

        search(toc)

        if (foundChapter) {
            return {
                index: foundIndex,
                title: foundChapter.label || foundChapter.title || '未知章节'
            }
        }

        return null
    }

    // 跳转到进度
    const goToProgress = (targetProgress: number) => {
        if (!rendition.value || !isReady.value) {
            console.warn('渲染器未就绪')
            return
        }

        if (!book.value || !(book.value as any).locations?.length()) {
            console.warn('位置索引未生成')
            return
        }

        const cfi = (book.value as any).locations.cfiFromPercentage(targetProgress / 100)
        if (cfi) {
            console.log('📍 跳转到进度:', targetProgress, '%')
                ; (rendition.value as any).display(cfi)
        }
    }

    // 跳转到位置
    const goToLocation = (location: { cfi?: string; href?: string }) => {
        if (!rendition.value) return

        if (location.cfi) {
            ; (rendition.value as any).display(location.cfi)
        } else if (location.href) {
            ; (rendition.value as any).display(location.href)
        }
    }

    // 跳转到章节
    const goToChapter = (index: number) => {
        if (!rendition.value || !book.value) return

        const item = (book.value as any).spine.get(index)
        if (item) {
            ; (rendition.value as any).display(item.href)
        }
    }

    // 获取当前位置
    const getCurrentLocation = () => {
        if (!rendition.value) return null

        const location = (rendition.value as any).currentLocation()
        return {
            cfi: location?.start?.cfi || '',
            href: location?.start?.href || ''
        }
    }

    // 获取当前页面文本（用于 TTS）
    const getCurrentPageText = (): string => {
        if (!rendition.value) return ''

        try {
            const contents = (rendition.value as any).getContents()
            if (!contents || contents.length === 0) return ''

            let text = ''
            contents.forEach((content: any) => {
                try {
                    const doc = content.document
                    if (doc && doc.body) {
                        // 获取可见区域的文本
                        text += doc.body.innerText || doc.body.textContent || ''
                    }
                } catch (e) {
                    console.warn('获取内容文本失败:', e)
                }
            })

            // 清理文本：移除多余空白
            return text.replace(/\s+/g, ' ').trim()
        } catch (error) {
            console.warn('获取页面文本失败:', error)
            return ''
        }
    }

    return {
        progress,
        currentPage,
        totalPages,
        currentChapterIndex,
        currentChapterTitle,
        bindLocationEvents,
        goToProgress,
        goToLocation,
        goToChapter,
        getCurrentLocation,
        getCurrentPageText
    }
}
