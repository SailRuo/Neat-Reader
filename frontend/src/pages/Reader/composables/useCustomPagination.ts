import { ref, Ref, computed } from 'vue'

export interface CustomPaginationOptions {
    pageMode: Ref<'page' | 'scroll'>
    containerRef: Ref<HTMLElement | null>
    getChapterCount: () => number
    getCurrentChapterIndex: () => number
    loadChapter: (index: number) => Promise<void>
}

export interface CustomPaginationReturn {
    currentPage: Ref<number>
    totalPages: Ref<number>
    chapterPageStart: Ref<number>
    chapterPageEnd: Ref<number>
    progress: Ref<number>
    nextPage: () => Promise<void>
    prevPage: () => Promise<void>
    goToPage: (page: number) => void
    updatePagination: () => void
    setChapterPages: (start: number, end: number) => void
}

export function useCustomPagination(
    options: CustomPaginationOptions
): CustomPaginationReturn {
    const currentPage = ref(1)
    const totalPages = ref(1)
    
    // 当前章节的页码范围（在全书中的绝对页码）
    const chapterPageStart = ref(1)
    const chapterPageEnd = ref(1)
    
    const progress = computed(() => {
        if (totalPages.value === 0) return 0
        return Math.round((currentPage.value / totalPages.value) * 100)
    })

    // 设置当前章节的页码范围
    const setChapterPages = (start: number, end: number) => {
        chapterPageStart.value = start
        chapterPageEnd.value = end
        totalPages.value = end  // 总页数就是最后一章的结束页码
        
        console.log('📊 [Pagination] 设置章节页码范围')
        console.log('  - 章节起始页:', start)
        console.log('  - 章节结束页:', end)
        console.log('  - 全书总页数:', totalPages.value)
    }

    // 更新分页信息
    const updatePagination = () => {
        if (!options.containerRef.value) return
        
        const container = options.containerRef.value
        
        if (options.pageMode.value === 'page') {
            // 翻页模式：基于章节内的相对页码
            const scrollWidth = container.scrollWidth
            const clientWidth = container.clientWidth
            
            const chapterPages = Math.max(1, Math.ceil(scrollWidth / clientWidth))
            
            // 根据当前滚动位置计算章节内的相对页码
            const scrollLeft = container.scrollLeft
            const relativePageInChapter = Math.floor(scrollLeft / clientWidth) + 1
            
            // 计算全书中的绝对页码
            currentPage.value = chapterPageStart.value + relativePageInChapter - 1
            
            console.log('📄 [Pagination] 更新分页信息')
            console.log('  - 章节内页数:', chapterPages)
            console.log('  - 章节内当前页:', relativePageInChapter)
            console.log('  - 全书当前页:', currentPage.value)
            console.log('  - 全书总页数:', totalPages.value)
        } else {
            // 滚动模式
            const scrollHeight = container.scrollHeight
            const clientHeight = container.clientHeight
            const scrollTop = container.scrollTop
            
            const scrollProgress = scrollHeight > clientHeight 
                ? (scrollTop / (scrollHeight - clientHeight)) * 100 
                : 0
            
            console.log('📜 [Pagination] 滚动进度:', scrollProgress.toFixed(2), '%')
        }
    }

    // 下一页
    const nextPage = async () => {
        if (!options.containerRef.value) return
        
        const container = options.containerRef.value
        
        if (options.pageMode.value === 'page') {
            const pageWidth = container.clientWidth
            const currentScroll = container.scrollLeft
            const maxScroll = container.scrollWidth - container.clientWidth
            
            // 如果当前章节还有下一页
            if (currentScroll < maxScroll - 10) {  // 留 10px 容差
                const nextScroll = Math.min(currentScroll + pageWidth, maxScroll)
                
                console.log('👉 [Pagination] 章节内翻页')
                
                container.scrollTo({
                    left: nextScroll,
                    behavior: 'smooth'
                })
                
                setTimeout(() => {
                    updatePagination()
                }, 300)
            } else {
                // 当前章节已到末尾，尝试加载下一章
                const currentChapterIndex = options.getCurrentChapterIndex()
                const totalChapters = options.getChapterCount()
                
                if (currentChapterIndex < totalChapters - 1) {
                    console.log('📖 [Pagination] 加载下一章')
                    await options.loadChapter(currentChapterIndex + 1)
                    
                    // 加载完成后滚动到开头
                    setTimeout(() => {
                        container.scrollLeft = 0
                        updatePagination()
                    }, 100)
                } else {
                    console.log('⚠️ [Pagination] 已到达全书末尾')
                }
            }
        } else {
            // 滚动模式
            const scrollAmount = container.clientHeight * 0.8
            container.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    // 上一页
    const prevPage = async () => {
        if (!options.containerRef.value) return
        
        const container = options.containerRef.value
        
        if (options.pageMode.value === 'page') {
            const currentScroll = container.scrollLeft
            
            // 如果当前章节还有上一页
            if (currentScroll > 10) {  // 留 10px 容差
                const pageWidth = container.clientWidth
                const prevScroll = Math.max(currentScroll - pageWidth, 0)
                
                console.log('👈 [Pagination] 章节内翻页')
                
                container.scrollTo({
                    left: prevScroll,
                    behavior: 'smooth'
                })
                
                setTimeout(() => {
                    updatePagination()
                }, 300)
            } else {
                // 当前章节已到开头，尝试加载上一章
                const currentChapterIndex = options.getCurrentChapterIndex()
                
                if (currentChapterIndex > 0) {
                    console.log('📖 [Pagination] 加载上一章')
                    await options.loadChapter(currentChapterIndex - 1)
                    
                    // 加载完成后滚动到末尾
                    setTimeout(() => {
                        const maxScroll = container.scrollWidth - container.clientWidth
                        container.scrollLeft = maxScroll
                        updatePagination()
                    }, 100)
                } else {
                    console.log('⚠️ [Pagination] 已到达全书开头')
                }
            }
        } else {
            // 滚动模式
            const scrollAmount = container.clientHeight * 0.8
            container.scrollBy({
                top: -scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    // 跳转到指定页（全书的绝对页码）
    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages.value) return
        
        console.log('🎯 [Pagination] 跳转到第', page, '页')
        
        // TODO: 需要先找到该页所在的章节，然后加载该章节，再滚动到对应位置
        // 这需要维护一个章节页码映射表
        console.warn('⚠️ [Pagination] 跨章节跳转功能待实现')
    }

    return {
        currentPage,
        totalPages,
        chapterPageStart,
        chapterPageEnd,
        progress,
        nextPage,
        prevPage,
        goToPage,
        updatePagination,
        setChapterPages
    }
}
