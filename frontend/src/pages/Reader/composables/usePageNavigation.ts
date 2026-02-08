import { Ref } from 'vue'
import { Book, Rendition } from 'epubjs'

export interface PageNavigationOptions {
    pageMode: Ref<'page' | 'scroll'>
    containerRef: Ref<HTMLElement | null>
}

export function usePageNavigation(
    rendition: Ref<Rendition | null>,
    book: Ref<Book | null>,
    isReady: Ref<boolean>,
    options: PageNavigationOptions
) {
    // 下一页
    const nextPage = async () => {
        if (!rendition.value || !isReady.value) {
            console.warn('❌ [NextPage] Rendition not ready')
            return
        }

        if (options.pageMode.value !== 'page') {
            console.log('⏭️ [NextPage] 滚动模式，跳过')
            return
        }

        console.log('👉 [NextPage] Triggered')
        
        // 获取当前位置
        const beforeLocation = (rendition.value as any).currentLocation()
        console.log('  - 翻页前 CFI:', beforeLocation?.start?.cfi)
        console.log('  - 翻页前 Href:', beforeLocation?.start?.href)
        console.log('  - 翻页前 Displayed:', beforeLocation?.start?.displayed)
        
        // 检查 rendition 的内部状态
        const manager = (rendition.value as any).manager
        const settings = (rendition.value as any).settings
        console.log('  - Manager 类型:', manager?.name)
        console.log('  - Manager 类:', manager?.constructor?.name)
        console.log('  - Flow 设置:', settings?.flow)
        console.log('  - Overflow 设置:', settings?.overflow)
        console.log('  - 当前视图数:', manager?.views?.length)
        
        // 🔍 检查 iframe 内的实际样式
        try {
            const contents = (rendition.value as any).getContents()
            if (contents && contents.length > 0) {
                const doc = contents[0].document
                if (doc && doc.body) {
                    const bodyStyle = window.getComputedStyle(doc.body)
                    console.log('  - Body column-width:', bodyStyle.columnWidth)
                    console.log('  - Body column-count:', bodyStyle.columnCount)
                    console.log('  - Body overflow:', bodyStyle.overflow)
                    console.log('  - Body width:', bodyStyle.width)
                    console.log('  - Body height:', bodyStyle.height)
                    console.log('  - Body scrollWidth:', doc.body.scrollWidth, 'px')
                    console.log('  - Body clientWidth:', doc.body.clientWidth, 'px')
                    
                    // 🎯 计算理论上应该有多少页
                    const scrollWidth = doc.body.scrollWidth
                    const clientWidth = doc.body.clientWidth
                    const theoreticalPages = Math.ceil(scrollWidth / clientWidth)
                    console.log('  - 理论页数:', theoreticalPages, '(scrollWidth / clientWidth)')
                }
            }
        } catch (e) {
            console.warn('  - 无法检查 iframe 样式:', e)
        }
        
        try {
            // 🎯 在 paginated 模式下，next() 会翻到下一栏（页）
            const result = await (rendition.value as any).next()
            console.log('  - next() 返回值:', result)
            
            // 等待一下让位置更新
            await new Promise(resolve => setTimeout(resolve, 100))
            
            const afterLocation = (rendition.value as any).currentLocation()
            console.log('  - 翻页后 CFI:', afterLocation?.start?.cfi)
            console.log('  - 翻页后 Href:', afterLocation?.start?.href)
            console.log('  - 翻页后 Displayed:', afterLocation?.start?.displayed)
            
            // 🎯 检查是否真的翻页了
            const hrefChanged = beforeLocation?.start?.href !== afterLocation?.start?.href
            const cfiChanged = beforeLocation?.start?.cfi !== afterLocation?.start?.cfi
            
            if (!cfiChanged) {
                console.warn('⚠️ [NextPage] CFI 未改变，可能已到达章节末尾')
                if (!hrefChanged) {
                    console.warn('⚠️ [NextPage] Href 也未改变，可能是分页配置有问题')
                }
            } else if (hrefChanged) {
                console.warn('⚠️ [NextPage] 跳到了新章节，可能是章内分页失败')
            } else {
                console.log('✅ [NextPage] 章内翻页成功')
            }
        } catch (error) {
            console.error('❌ [NextPage] Failed:', error)
        }
    }

    // 上一页
    const prevPage = async () => {
        if (!rendition.value || !isReady.value) {
            console.warn('❌ [PrevPage] Rendition not ready')
            return
        }

        if (options.pageMode.value !== 'page') {
            console.log('⏮️ [PrevPage] 滚动模式，跳过')
            return
        }

        console.log('👈 [PrevPage] Triggered')
        
        try {
            // 🎯 在 paginated 模式下，prev() 会翻到上一栏（页）
            await (rendition.value as any).prev()
            console.log('✅ [PrevPage] Completed')
        } catch (error) {
            console.error('❌ [PrevPage] Failed:', error)
        }
    }

    // 跳转到开头
    const goToStart = () => {
        if (!rendition.value || !book.value) return

        const spine = (book.value as any).spine
        if (spine?.first) {
            ;(rendition.value as any).display(spine.first().href)
        }
    }

    // 跳转到结尾
    const goToEnd = () => {
        if (!rendition.value || !book.value) return

        const spine = (book.value as any).spine
        if (spine?.last) {
            ;(rendition.value as any).display(spine.last().href)
        }
    }

    // 调整尺寸
    const resize = () => {
        if (!rendition.value || !options.containerRef.value) return

        const container = options.containerRef.value
        const width = container.clientWidth
        const height = container.clientHeight

        if (width > 0 && height > 0) {
            console.log('📐 [Resize] 调整尺寸:', width, 'x', height)
            
            // 保存当前位置
            const currentLocation = (rendition.value as any).currentLocation()
            
            // 调整尺寸
            ;(rendition.value as any).resize(width, height)
            
            // 如果有当前位置，重新定位（避免内容跳动）
            if (currentLocation?.start?.cfi) {
                setTimeout(() => {
                    ;(rendition.value as any).display(currentLocation.start.cfi)
                }, 50)
            }
        }
    }

    // 为内容设置导航钩子
    const setupNavigationHooks = (contents: any, onClick?: () => void) => {
        const doc = contents.document
        if (!doc) return

        // 检查是否已设置
        try {
            const root = doc?.documentElement
            if (root?.getAttribute('data-nav-hooks') === '1') return
            root?.setAttribute('data-nav-hooks', '1')
        } catch (e) { }

        // 🔧 修复：只保留滚轮翻页，点击只用于显示/隐藏控制栏
        doc.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement
            
            // 忽略链接点击
            const anchor = target.closest('a')
            if (anchor) return
            
            // 忽略高亮点击
            if (target.classList.contains('epub-highlight')) return

            // 🎯 只调用控制栏显示回调，不触发翻页
            onClick?.()
        })

        // 滚轮事件（翻页模式）- 只在翻页模式下启用
        let wheelTimeout: ReturnType<typeof setTimeout> | null = null

        doc.addEventListener('wheel', (e: WheelEvent) => {
            if (options.pageMode.value !== 'page') return
            if (!rendition.value || !isReady.value) return

            e.preventDefault()
            e.stopPropagation()

            if (wheelTimeout) return

            wheelTimeout = setTimeout(() => {
                wheelTimeout = null
            }, 200)

            if (e.deltaY > 0) {
                nextPage()
            } else if (e.deltaY < 0) {
                prevPage()
            }
        }, { passive: false, capture: true })

        // 键盘事件 - 只在翻页模式下响应
        doc.addEventListener('keydown', (e: KeyboardEvent) => {
            if (options.pageMode.value === 'page') {
                switch (e.key) {
                    case 'ArrowLeft':
                    case 'PageUp':
                        e.preventDefault()
                        prevPage()
                        break
                    case 'ArrowRight':
                    case 'PageDown':
                    case ' ':
                        e.preventDefault()
                        nextPage()
                        break
                }
            }
        })
    }

    // 绑定全局键盘事件
    const bindGlobalKeyboardEvents = () => {
        const handleKeydown = (e: KeyboardEvent) => {
            if (!rendition.value || !isReady.value) return

            // 忽略输入框中的按键
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return
            }

            if (options.pageMode.value === 'page') {
                switch (e.key) {
                    case 'ArrowLeft':
                    case 'PageUp':
                        e.preventDefault()
                        prevPage()
                        break
                    case 'ArrowRight':
                    case 'PageDown':
                    case ' ':
                        e.preventDefault()
                        nextPage()
                        break
                    case 'Home':
                        e.preventDefault()
                        goToStart()
                        break
                    case 'End':
                        e.preventDefault()
                        goToEnd()
                        break
                }
            }
        }

        document.addEventListener('keydown', handleKeydown)

        // 返回清理函数
        return () => {
            document.removeEventListener('keydown', handleKeydown)
        }
    }

    // 绑定窗口调整事件
    const bindResizeEvents = () => {
        let resizeTimeout: ReturnType<typeof setTimeout> | null = null

        const handleResize = () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout)
            }
            resizeTimeout = setTimeout(() => {
                resize()
            }, 150)
        }

        window.addEventListener('resize', handleResize)

        return () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout)
            }
            window.removeEventListener('resize', handleResize)
        }
    }

    // 获取当前页面文本
    const getCurrentPageText = async (): Promise<string> => {
        if (!rendition.value || !isReady.value) {
            console.warn('❌ [GetPageText] Rendition not ready')
            return ''
        }

        try {
            // 获取当前显示的内容
            const contents = (rendition.value as any).getContents()
            if (!contents || contents.length === 0) {
                console.warn('❌ [GetPageText] No contents available')
                return ''
            }

            // 提取所有可见内容的文本
            let text = ''
            for (const content of contents) {
                const doc = content.document
                if (doc && doc.body) {
                    // 获取 body 的文本内容，过滤掉脚本和样式
                    const bodyText = doc.body.innerText || doc.body.textContent || ''
                    text += bodyText + '\n'
                }
            }

            // 清理文本：移除多余空白和换行
            text = text
                .replace(/\n\s*\n/g, '\n\n') // 多个空行合并为两个
                .replace(/[ \t]+/g, ' ') // 多个空格合并为一个
                .trim()

            console.log('📄 [GetPageText] 提取文本长度:', text.length)
            return text
        } catch (error) {
            console.error('❌ [GetPageText] Failed:', error)
            return ''
        }
    }

    return {
        nextPage,
        prevPage,
        goToStart,
        goToEnd,
        resize,
        setupNavigationHooks,
        bindGlobalKeyboardEvents,
        bindResizeEvents,
        getCurrentPageText
    }
}