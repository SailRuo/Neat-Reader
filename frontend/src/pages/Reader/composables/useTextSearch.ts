import { ref, Ref } from 'vue'
import { Book, Rendition } from 'epubjs'

export interface SearchResult {
    cfi: string
    excerpt: string
    chapter?: string
}

export function useTextSearch(
    book: Ref<Book | null>,
    rendition: Ref<Rendition | null>
) {
    const searchResults = ref<SearchResult[]>([])
    const isSearching = ref(false)
    const searchQuery = ref('')
    const currentResultIndex = ref(-1)

    // 执行搜索
    const search = async (query: string): Promise<SearchResult[]> => {
        if (!book.value || !query.trim()) {
            searchResults.value = []
            return []
        }

        isSearching.value = true
        searchQuery.value = query.trim()

        try {
            console.log('🔍 开始搜索:', query)

            const results: SearchResult[] = []
            const spine = (book.value as any).spine

            // 遍历所有章节进行搜索
            for (const item of spine.items) {
                try {
                    const doc = await item.load((book.value as any).load.bind(book.value))
                    const content = doc.body?.textContent || ''

                    // 简单的关键词搜索
                    const lowerContent = content.toLowerCase()
                    const lowerQuery = query.toLowerCase()

                    let index = 0
                    while ((index = lowerContent.indexOf(lowerQuery, index)) !== -1) {
                        // 获取上下文
                        const start = Math.max(0, index - 30)
                        const end = Math.min(content.length, index + query.length + 30)
                        const excerpt = content.substring(start, end)

                        // 尝试获取 CFI
                        try {
                            // 创建一个简单的选区来获取 CFI
                            const section = (book.value as any).spine.get(item.href)
                            if (section) {
                                results.push({
                                    cfi: section.cfiFromElement ? section.cfiBase : `epubcfi(${item.cfiBase})`,
                                    excerpt: (start > 0 ? '...' : '') + excerpt + (end < content.length ? '...' : ''),
                                    chapter: item.label || item.href
                                })
                            }
                        } catch (e) {
                            // 如果无法获取精确 CFI，使用章节 href
                            results.push({
                                cfi: item.href,
                                excerpt: (start > 0 ? '...' : '') + excerpt + (end < content.length ? '...' : ''),
                                chapter: item.label || item.href
                            })
                        }

                        index += query.length

                        // 限制结果数量
                        if (results.length >= 100) break
                    }

                    item.unload()
                } catch (e) {
                    console.warn('搜索章节失败:', item.href, e)
                }

                if (results.length >= 100) break
            }

            console.log('✅ 搜索完成，结果数量:', results.length)
            searchResults.value = results
            currentResultIndex.value = results.length > 0 ? 0 : -1

            return results
        } catch (error) {
            console.error('❌ 搜索失败:', error)
            searchResults.value = []
            return []
        } finally {
            isSearching.value = false
        }
    }

    // 跳转到搜索结果
    const goToResult = (index: number) => {
        if (!rendition.value || index < 0 || index >= searchResults.value.length) return

        const result = searchResults.value[index]
        currentResultIndex.value = index

        try {
            // 尝试使用 CFI 跳转
            if (result.cfi.startsWith('epubcfi')) {
                ; (rendition.value as any).display(result.cfi)
            } else {
                // 使用 href 跳转
                ; (rendition.value as any).display(result.cfi)
            }
            console.log('📍 跳转到搜索结果:', index, result.cfi)
        } catch (error) {
            console.warn('跳转失败:', error)
        }
    }

    // 下一个结果
    const nextResult = () => {
        if (searchResults.value.length === 0) return
        const nextIndex = (currentResultIndex.value + 1) % searchResults.value.length
        goToResult(nextIndex)
    }

    // 上一个结果
    const prevResult = () => {
        if (searchResults.value.length === 0) return
        const prevIndex = (currentResultIndex.value - 1 + searchResults.value.length) % searchResults.value.length
        goToResult(prevIndex)
    }

    // 清除搜索
    const clearSearch = () => {
        searchResults.value = []
        searchQuery.value = ''
        currentResultIndex.value = -1
    }

    return {
        searchResults,
        isSearching,
        searchQuery,
        currentResultIndex,
        search,
        goToResult,
        nextResult,
        prevResult,
        clearSearch
    }
}
