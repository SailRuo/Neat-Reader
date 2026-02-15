import { ref, Ref } from 'vue'
import JSZip from 'jszip'
import localforage from 'localforage'

export interface Chapter {
    id: string
    href: string
    title: string
    content: string
}

export interface EpubMetadata {
    title: string
    author: string
    publisher?: string
    language?: string
    identifier?: string
}

export interface CustomEpubCoreOptions {
    pageMode: Ref<'page' | 'scroll'>
    containerRef: Ref<HTMLElement | null>
}

export interface CustomEpubCoreReturn {
    metadata: Ref<EpubMetadata | null>
    chapters: Ref<Chapter[]>
    currentChapterIndex: Ref<number>
    isReady: Ref<boolean>
    error: Ref<{ title: string; message: string } | null>
    initialize: () => Promise<void>
    destroy: () => void
    loadChapter: (index: number) => Promise<void>
    nextChapter: () => Promise<void>
    prevChapter: () => Promise<void>
}

export function useCustomEpubCore(
    bookId: Ref<string>,
    options: CustomEpubCoreOptions
): CustomEpubCoreReturn {
    const metadata = ref<EpubMetadata | null>(null)
    const chapters = ref<Chapter[]>([])
    const currentChapterIndex = ref(0)
    const isReady = ref(false)
    const error = ref<{ title: string; message: string } | null>(null)
    
    let zip: JSZip | null = null
    let rootPath = ''
    let resources: Map<string, string> = new Map() // 资源文件的 blob URL

    // 解析 XML（使用浏览器原生 DOMParser）
    const parseXml = (xmlString: string): Document => {
        const parser = new DOMParser()
        const doc = parser.parseFromString(xmlString, 'text/xml')
        
        // 检查解析错误
        const parserError = doc.querySelector('parsererror')
        if (parserError) {
            throw new Error('XML 解析失败: ' + parserError.textContent)
        }
        
        return doc
    }

    // 获取 content.opf 路径
    const getContentOpfPath = async (): Promise<string> => {
        if (!zip) throw new Error('ZIP not loaded')
        
        const containerXml = await zip.file('META-INF/container.xml')?.async('text')
        if (!containerXml) throw new Error('container.xml not found')
        
        const doc = parseXml(containerXml)
        const rootfile = doc.querySelector('rootfile')
        if (!rootfile) throw new Error('rootfile not found in container.xml')
        
        return rootfile.getAttribute('full-path') || ''
    }

    // 解析 content.opf
    const parseContentOpf = async (opfPath: string) => {
        if (!zip) throw new Error('ZIP not loaded')
        
        const opfContent = await zip.file(opfPath)?.async('text')
        if (!opfContent) throw new Error('content.opf not found')
        
        const doc = parseXml(opfContent)
        const pkg = doc.documentElement
        
        // 提取元数据
        const metadataEl = pkg.querySelector('metadata')
        if (metadataEl) {
            metadata.value = {
                title: metadataEl.querySelector('title')?.textContent || 'Unknown',
                author: metadataEl.querySelector('creator')?.textContent || 'Unknown',
                publisher: metadataEl.querySelector('publisher')?.textContent || undefined,
                language: metadataEl.querySelector('language')?.textContent || undefined,
                identifier: metadataEl.querySelector('identifier')?.textContent || undefined
            }
        }
        
        console.log('📚 [CustomEpub] 元数据:', metadata.value)
        
        // 提取 manifest（资源列表）
        const manifestEl = pkg.querySelector('manifest')
        const manifestItems = manifestEl?.querySelectorAll('item') || []
        const manifestMap = new Map<string, { id: string; href: string; mediaType: string }>()
        
        manifestItems.forEach((item) => {
            const id = item.getAttribute('id') || ''
            const href = item.getAttribute('href') || ''
            const mediaType = item.getAttribute('media-type') || ''
            manifestMap.set(id, { id, href, mediaType })
        })
        
        // 提取 spine（章节顺序）
        const spineEl = pkg.querySelector('spine')
        const spineItems = spineEl?.querySelectorAll('itemref') || []
        
        console.log('📖 [CustomEpub] 章节数量:', spineItems.length)
        
        // 提取 toc（目录）
        let tocMap = new Map<string, string>()
        try {
            const tocId = spineEl?.getAttribute('toc') || 'ncx'
            const tocItem = manifestMap.get(tocId)
            if (tocItem) {
                const tocPath = rootPath + tocItem.href
                const tocContent = await zip.file(tocPath)?.async('text')
                if (tocContent) {
                    const tocDoc = parseXml(tocContent)
                    const navPoints = tocDoc.querySelectorAll('navPoint')
                    navPoints.forEach((point) => {
                        const label = point.querySelector('text')?.textContent || ''
                        const src = point.querySelector('content')?.getAttribute('src') || ''
                        const href = src.split('#')[0] // 移除锚点
                        if (href) {
                            tocMap.set(href, label)
                        }
                    })
                }
            }
        } catch (e) {
            console.warn('⚠️ [CustomEpub] 无法解析目录:', e)
        }
        
        // 构建章节列表
        const chapterList: Chapter[] = []
        
        spineItems.forEach((itemref, i) => {
            const idref = itemref.getAttribute('idref') || ''
            const manifestItem = manifestMap.get(idref)
            
            if (manifestItem && manifestItem.mediaType === 'application/xhtml+xml') {
                const href = manifestItem.href
                const title = tocMap.get(href) || `Chapter ${i + 1}`
                
                chapterList.push({
                    id: idref,
                    href: href,
                    title: title,
                    content: '' // 延迟加载
                })
            }
        })
        
        chapters.value = chapterList
        console.log('✅ [CustomEpub] 章节列表构建完成')
    }

    // 加载资源文件（图片、CSS等）
    const loadResource = async (resourcePath: string): Promise<string> => {
        if (!zip) throw new Error('ZIP not loaded')
        
        // 检查缓存
        if (resources.has(resourcePath)) {
            return resources.get(resourcePath)!
        }
        
        const fullPath = rootPath + resourcePath
        const file = zip.file(fullPath)
        
        if (!file) {
            console.warn('⚠️ [CustomEpub] 资源未找到:', resourcePath)
            return ''
        }
        
        const blob = await file.async('blob')
        const url = URL.createObjectURL(blob)
        resources.set(resourcePath, url)
        
        return url
    }

    // 处理 HTML 中的资源引用
    const processHtmlResources = async (html: string, chapterHref: string): Promise<string> => {
        const chapterDir = chapterHref.substring(0, chapterHref.lastIndexOf('/') + 1)
        
        // 处理图片
        html = await processImages(html, chapterDir)
        
        // 处理 CSS
        html = await processCss(html, chapterDir)
        
        return html
    }

    const processImages = async (html: string, baseDir: string): Promise<string> => {
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
        const matches = [...html.matchAll(imgRegex)]
        
        for (const match of matches) {
            const originalSrc = match[1]
            const resolvedPath = resolvePath(baseDir, originalSrc)
            const blobUrl = await loadResource(resolvedPath)
            
            if (blobUrl) {
                html = html.replace(originalSrc, blobUrl)
            }
        }
        
        return html
    }

    const processCss = async (html: string, baseDir: string): Promise<string> => {
        const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi
        const matches = [...html.matchAll(linkRegex)]
        
        for (const match of matches) {
            const originalHref = match[1]
            if (originalHref.endsWith('.css')) {
                const resolvedPath = resolvePath(baseDir, originalHref)
                const cssContent = await loadCssContent(resolvedPath)
                
                if (cssContent) {
                    // 将 <link> 替换为 <style>
                    const styleTag = `<style>${cssContent}</style>`
                    html = html.replace(match[0], styleTag)
                }
            }
        }
        
        return html
    }

    const loadCssContent = async (cssPath: string): Promise<string> => {
        if (!zip) return ''
        
        const fullPath = rootPath + cssPath
        const file = zip.file(fullPath)
        
        if (!file) return ''
        
        let css = await file.async('text')
        
        // 处理 CSS 中的 url() 引用
        const cssDir = cssPath.substring(0, cssPath.lastIndexOf('/') + 1)
        const urlRegex = /url\(["']?([^"')]+)["']?\)/gi
        const matches = [...css.matchAll(urlRegex)]
        
        for (const match of matches) {
            const originalUrl = match[1]
            const resolvedPath = resolvePath(cssDir, originalUrl)
            const blobUrl = await loadResource(resolvedPath)
            
            if (blobUrl) {
                css = css.replace(match[0], `url(${blobUrl})`)
            }
        }
        
        return css
    }

    // 解析相对路径
    const resolvePath = (base: string, relative: string): string => {
        if (relative.startsWith('http://') || relative.startsWith('https://')) {
            return relative
        }
        
        if (relative.startsWith('/')) {
            return relative.substring(1)
        }
        
        const parts = (base + relative).split('/')
        const resolved: string[] = []
        
        for (const part of parts) {
            if (part === '..') {
                resolved.pop()
            } else if (part !== '.' && part !== '') {
                resolved.push(part)
            }
        }
        
        return resolved.join('/')
    }

    // 加载章节内容
    const loadChapter = async (index: number) => {
        if (index < 0 || index >= chapters.value.length) {
            console.warn('⚠️ [CustomEpub] 章节索引越界:', index)
            return
        }
        
        const chapter = chapters.value[index]
        
        console.log('📖 [CustomEpub] 加载章节:', index, chapter.title)
        
        // 如果已经加载过，直接使用缓存
        if (chapter.content) {
            currentChapterIndex.value = index
            renderChapter(chapter.content)
            return
        }
        
        // 加载章节 HTML
        if (!zip) throw new Error('ZIP not loaded')
        
        const fullPath = rootPath + chapter.href
        let html = await zip.file(fullPath)?.async('text') || ''
        
        // 处理资源引用
        html = await processHtmlResources(html, chapter.href)
        
        // 缓存内容
        chapter.content = html
        
        currentChapterIndex.value = index
        renderChapter(html)
    }

    // 渲染章节到容器
    const renderChapter = (html: string) => {
        if (!options.containerRef.value) return
        
        const container = options.containerRef.value
        
        // 提取 body 内容
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        const bodyContent = bodyMatch ? bodyMatch[1] : html
        
        container.innerHTML = bodyContent
        
        console.log('✅ [CustomEpub] 章节渲染完成')
        console.log('  - HTML 长度:', html.length)
        console.log('  - Body 内容长度:', bodyContent.length)
        console.log('  - 文本长度:', container.textContent?.length || 0)
    }

    // 下一章
    const nextChapter = async () => {
        if (currentChapterIndex.value < chapters.value.length - 1) {
            await loadChapter(currentChapterIndex.value + 1)
        }
    }

    // 上一章
    const prevChapter = async () => {
        if (currentChapterIndex.value > 0) {
            await loadChapter(currentChapterIndex.value - 1)
        }
    }

    // 初始化
    const initialize = async () => {
        console.log('🚀 [CustomEpub] 开始初始化...')
        
        if (!options.containerRef.value) {
            error.value = { title: '初始化失败', message: '容器元素不存在' }
            return
        }
        
        error.value = null
        isReady.value = false
        
        try {
            // 加载书籍内容
            const content = await localforage.getItem<ArrayBuffer>(`ebook_content_${bookId.value}`)
            if (!content) {
                error.value = { title: '内容加载失败', message: '书籍文件可能已损坏或丢失，请重新导入' }
                return
            }
            
            console.log('✅ [CustomEpub] 书籍内容加载成功，大小:', content.byteLength, 'bytes')
            
            // 解压 EPUB
            zip = await JSZip.loadAsync(content)
            console.log('✅ [CustomEpub] EPUB 解压成功')
            
            // 获取 content.opf 路径
            const opfPath = await getContentOpfPath()
            rootPath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
            console.log('📁 [CustomEpub] Root path:', rootPath)
            
            // 解析 content.opf
            await parseContentOpf(opfPath)
            
            // 加载第一章
            if (chapters.value.length > 0) {
                await loadChapter(0)
            }
            
            isReady.value = true
            console.log('🎉 [CustomEpub] 初始化完成')
            
        } catch (err) {
            console.error('❌ [CustomEpub] 初始化失败:', err)
            error.value = {
                title: '初始化失败',
                message: err instanceof Error ? err.message : '未知错误'
            }
        }
    }

    // 销毁
    const destroy = () => {
        // 释放所有 blob URL
        resources.forEach(url => URL.revokeObjectURL(url))
        resources.clear()
        
        zip = null
        isReady.value = false
        
        console.log('🗑️ [CustomEpub] 资源已清理')
    }

    return {
        metadata,
        chapters,
        currentChapterIndex,
        isReady,
        error,
        initialize,
        destroy,
        loadChapter,
        nextChapter,
        prevChapter
    }
}
