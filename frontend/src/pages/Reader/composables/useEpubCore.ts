import { ref, shallowRef, Ref } from 'vue'
import ePub, { Book, Rendition } from 'epubjs'
import localforage from 'localforage'

export interface EpubCoreOptions {
    pageMode: Ref<'page' | 'scroll'>
    containerRef: Ref<HTMLElement | null>
}

export interface EpubCoreReturn {
    book: Ref<Book | null>
    rendition: Ref<Rendition | null>
    isReady: Ref<boolean>
    error: Ref<{ title: string; message: string } | null>
    chapters: Ref<any[]>
    initialize: () => Promise<void>
    destroy: () => void
    reinitialize: () => Promise<void>
}

export function useEpubCore(
    bookId: Ref<string>,
    options: EpubCoreOptions
): EpubCoreReturn {
    const book = shallowRef<Book | null>(null)
    const rendition = shallowRef<Rendition | null>(null)
    const isReady = ref(false)
    const error = ref<{ title: string; message: string } | null>(null)
    const chapters = ref<any[]>([])

    // 等待容器尺寸准备就绪
    const waitForContainerSize = async (): Promise<{ width: number; height: number }> => {
        for (let i = 0; i < 50; i++) {
            await new Promise(resolve => setTimeout(resolve, 20))
            const el = options.containerRef.value
            if (el && el.clientWidth > 100 && el.clientHeight > 100) {
                return { width: el.clientWidth, height: el.clientHeight }
            }
        }
        // 返回默认尺寸
        return { width: 800, height: 600 }
    }

    // 初始化
    const initialize = async () => {
        console.log('🚀 [useEpubCore] 开始初始化...')

        if (!options.containerRef.value) {
            error.value = { title: '初始化失败', message: '容器元素不存在' }
            return
        }

        error.value = null
        isReady.value = false

        // 设置容器样式
        const container = options.containerRef.value
        container.style.width = '100%'
        container.style.height = '100%'
        container.style.position = 'relative'
        container.style.overflow = 'hidden'

        // 等待容器有实际尺寸
        const { width, height } = await waitForContainerSize()
        console.log('📐 [useEpubCore] 容器尺寸:', width, 'x', height)

        try {
            // 加载书籍内容
            const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${bookId.value}`)
            if (!content) {
                error.value = { title: '内容加载失败', message: '书籍文件可能已损坏或丢失，请重新导入' }
                return
            }

            console.log('✅ 书籍内容加载成功，大小:', content.byteLength, 'bytes')

            // 创建书籍实例
            book.value = ePub(content) as unknown as Book

            // 等待书籍准备就绪
            await book.value.ready
            console.log('✅ 书籍准备就绪')

            // 根据模式创建不同的渲染配置
            const isPageMode = options.pageMode.value === 'page'

            // 🎯 关键修复：确保使用实际的容器尺寸
            const actualWidth = container.clientWidth
            const actualHeight = container.clientHeight
            
            console.log('📐 [useEpubCore] 容器尺寸:', actualWidth, 'x', actualHeight)
            console.log('📐 [useEpubCore] 页面模式:', isPageMode ? '翻页' : '滚动')

            // 创建渲染器 - 关键配置
            // 🎯 新方案：使用 continuous 流模式 + 手动分页
            // epub.js 的 paginated 模式在某些情况下分页不正确
            const renderOptions: any = {
                width: actualWidth,
                height: actualHeight,
                spread: 'none',
                allowScriptedContent: true,
                allowPopups: false,
                ignoreClass: 'annotator-hl'
            }

            if (isPageMode) {
                // 🎯 翻页模式：使用正确的 epub.js 配置
                // flow: 'paginated' 告诉 epub.js 使用分页布局
                // manager: 'default' 使用默认的分页管理器
                renderOptions.flow = 'paginated'
                renderOptions.manager = 'default'
                renderOptions.snap = false  // 不使用 snap，让我们自己控制翻页
                renderOptions.minSpreadWidth = 99999  // 强制单页显示
                // 🎯 关键：不设置 overflow，让 epub.js 自己处理
                // renderOptions.overflow = 'hidden'
            } else {
                // 滚动模式：使用 scrolled-doc
                renderOptions.flow = 'scrolled-doc'
                renderOptions.manager = 'continuous'
            }

            console.log('📖 [useEpubCore] 渲染配置:', renderOptions)

            rendition.value = book.value.renderTo(container, renderOptions) as unknown as Rendition

            // 🔍 检查 epub.js 实际使用的配置
            console.log('📖 [useEpubCore] 渲染器创建完成')
            console.log('  - Manager 类型:', (rendition.value as any).manager?.name)
            console.log('  - Manager 类:', (rendition.value as any).manager?.constructor?.name)
            console.log('  - Flow 设置:', (rendition.value as any).settings?.flow)
            console.log('  - Width:', (rendition.value as any).settings?.width)
            console.log('  - Height:', (rendition.value as any).settings?.height)
            console.log('  - Overflow:', (rendition.value as any).settings?.overflow)

            // 🎯 使用 epub.js Themes API 注册和应用主题
            // 这比直接注入 CSS 更可靠
            if (isPageMode) {
                // const columnWidth = actualWidth - 80
                // const columnGap = 40
                
                try {
                    // 🎯 关键修复：使用 epub.js 内置的分页机制，不要手动设置列布局
                    // epub.js 的 paginated 模式会自动处理分页
                    ;(rendition.value as any).themes.register('paginated', {
                        'html': {
                            'margin': '0 !important',
                            'padding': '0 !important',
                            'height': '100% !important',
                            'overflow': 'hidden !important'
                        },
                        'body': {
                            'margin': '0 !important',
                            'padding': '40px !important',
                            'height': '100% !important',
                            'overflow': 'hidden !important'
                        },
                        'img, table, pre, code': {
                            'max-width': '100% !important'
                        }
                    })
                    ;(rendition.value as any).themes.select('paginated')
                    console.log('✅ [useEpubCore] 已注册并应用 paginated 主题')
                } catch (e) {
                    console.error('❌ [useEpubCore] 主题注册失败:', e)
                }
            }

            // 样式注入 - 作为备用方案
            ;(rendition.value as any).hooks.content.register((contents: any) => {
                const doc = contents.document
                if (doc && doc.documentElement) {
                    console.log('📄 [useEpubCore] 内容渲染，注入样式')
                    
                    const style = doc.createElement('style')
                    if (isPageMode) {
                        // 🎯 翻页模式：让 epub.js 自己处理分页，我们只设置基本样式
                        style.textContent = `
                            * {
                                box-sizing: border-box;
                            }
                            html {
                                margin: 0 !important;
                                padding: 0 !important;
                                height: 100% !important;
                                overflow: hidden !important;
                            }
                            body {
                                margin: 0 !important;
                                padding: 40px !important;
                                height: 100% !important;
                                overflow: hidden !important;
                            }
                            img, table, pre, code {
                                max-width: 100% !important;
                            }
                        `
                        
                        console.log('  - 注入基本样式（让 epub.js 处理分页）')
                    } else {
                        // 滚动模式：允许垂直滚动
                        style.textContent = `
                            * {
                                box-sizing: border-box;
                            }
                            html, body {
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            body {
                                padding: 20px 40px !important;
                            }
                        `
                    }
                    doc.head.appendChild(style)
                }
            })

            // 显示内容
            await (rendition.value as any).display()
            console.log('✅ 内容显示完成')

            // 🎯 关键修复：在翻页模式下，显示后需要等待布局完成
            if (isPageMode) {
                // 等待 iframe 加载和布局完成
                await new Promise(resolve => setTimeout(resolve, 300))
                
                // 🔍 检查实际的分页情况
                const location = (rendition.value as any).currentLocation()
                console.log('📍 [useEpubCore] 初始位置信息:')
                console.log('  - CFI:', location?.start?.cfi)
                console.log('  - Href:', location?.start?.href)
                console.log('  - Displayed:', location?.start?.displayed)
                console.log('  - Total locations:', location?.start?.displayed?.total)
                
                // 检查 iframe 内的实际样式
                try {
                    const contents = (rendition.value as any).getContents()
                    if (contents && contents.length > 0) {
                        const doc = contents[0].document
                        if (doc && doc.body) {
                            const bodyStyle = window.getComputedStyle(doc.body)
                            console.log('  - Body column-width:', bodyStyle.columnWidth)
                            console.log('  - Body column-count:', bodyStyle.columnCount)
                            console.log('  - Body width:', bodyStyle.width)
                            console.log('  - Body height:', bodyStyle.height)
                            console.log('  - Body scrollWidth:', doc.body.scrollWidth)
                            console.log('  - Body scrollHeight:', doc.body.scrollHeight)
                        }
                    }
                } catch (e) {
                    console.warn('  - 无法检查 iframe 样式:', e)
                }
            }

            // 生成位置索引
            try {
                await (book.value as any).locations.generate(1024)
                console.log('✅ 位置索引生成完成，总位置数:', (book.value as any).locations.length())
            } catch (e) {
                console.warn('位置索引生成失败:', e)
            }

            // 获取章节列表
            chapters.value = (book.value as any).navigation?.toc || []

            isReady.value = true
            console.log('🎉 EPUB 阅读器初始化完成')

        } catch (err) {
            console.error('❌ 初始化失败:', err)
            error.value = {
                title: '初始化失败',
                message: err instanceof Error ? err.message : '未知错误'
            }
        }
    }

    // 销毁
    const destroy = () => {
        if (rendition.value) {
            try {
                (rendition.value as any).destroy()
            } catch (e) {
                console.warn('销毁渲染器失败:', e)
            }
            rendition.value = null
        }
        if (book.value) {
            try {
                (book.value as any).destroy()
            } catch (e) {
                console.warn('销毁书籍失败:', e)
            }
            book.value = null
        }
        isReady.value = false
    }

    // 重新初始化
    const reinitialize = async () => {
        destroy()
        await new Promise(resolve => setTimeout(resolve, 100))
        await initialize()
    }

    return {
        book,
        rendition,
        isReady,
        error,
        chapters,
        initialize,
        destroy,
        reinitialize
    }
}
