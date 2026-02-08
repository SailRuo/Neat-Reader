import { ref, Ref } from 'vue'
import { Rendition } from 'epubjs'

export interface Note {
    id: string
    bookId: string
    text: string
    content: string
    color: string
    cfi: string
    chapter: string
    chapterIndex: number
    timestamp: number
}

export function useAnnotations(rendition: Ref<Rendition | null>) {
    const notes = ref<Note[]>([])

    let annotationsPatched = false

    const ensureAnnotationsPatched = () => {
        if (annotationsPatched) return
        if (!rendition.value) return

        const annotations = (rendition.value as any).annotations
        if (!annotations) return

        const originalInject = annotations.inject
        if (typeof originalInject === 'function') {
            annotations.inject = function (...args: any[]) {
                try {
                    return originalInject.apply(this, args)
                } catch (error) {
                    console.warn('⚠️ [Annotations] inject failed (ignored):', error)
                }
            }
        }

        annotationsPatched = true
    }

    // 设置笔记列表
    const setNotes = (notesList: Note[]) => {
        ensureAnnotationsPatched()
        notes.value = notesList
    }

    // 添加高亮
    const addHighlight = (cfi: string, color: string, note: Note) => {
        if (!rendition.value) return
        ensureAnnotationsPatched()

        try {
            console.log('🎨 添加高亮:', { cfi, color, noteId: note.id })

                ; (rendition.value as any).annotations.add(
                    'highlight',
                    cfi,
                    { noteId: note.id },
                    null,
                    'epub-highlight',
                    {
                        fill: color,
                        fillOpacity: '0.3',
                        mixBlendMode: 'multiply'
                    }
                )

            console.log('✅ 高亮添加成功')
        } catch (error) {
            console.warn('添加高亮失败:', error)
        }
    }

    // 移除高亮
    const removeHighlight = (cfi: string) => {
        if (!rendition.value) return

        try {
            ; (rendition.value as any).annotations.remove(cfi, 'highlight')
            console.log('🗑️ 高亮已移除:', cfi)
        } catch (error) {
            console.warn('移除高亮失败:', error)
        }
    }

    // 恢复所有高亮
    const restoreHighlights = (contents?: any) => {
        if (!notes.value || notes.value.length === 0) return
        ensureAnnotationsPatched()

        console.log('🎨 恢复高亮，笔记数量:', notes.value.length)

        notes.value.forEach(note => {
            if (note.cfi) {
                try {
                    addHighlight(note.cfi, note.color, note)
                } catch (error) {
                    console.warn('恢复高亮失败:', error)
                }
            }
        })
    }

    // 清除文本选区
    const clearSelection = () => {
        if (window.getSelection) {
            window.getSelection()?.removeAllRanges()
        }
    }

    // 绑定文本选择事件
    const bindSelectionEvents = (
        onTextSelected?: (data: { text: string; cfi: string }) => void,
        onHighlightClicked?: (note: Note) => void
    ) => {
        if (!rendition.value) return

            // 选择事件
            ; (rendition.value as any).on('selected', (cfiRange: string, contents: any) => {
                const selection = contents.window.getSelection()
                if (selection && selection.toString().trim().length > 0) {
                    const text = selection.toString().trim()
                    onTextSelected?.({ text, cfi: cfiRange })
                }
            })
    }

    // 为内容设置高亮点击和选择钩子
    const setupContentHooks = (
        contents: any,
        onTextSelected?: (data: { text: string; cfi: string }) => void,
        onHighlightClicked?: (note: Note) => void
    ) => {
        const doc = contents.document
        const win = contents.window

        // 检查是否已设置
        try {
            const root = doc?.documentElement
            if (root?.getAttribute('data-annotations-hooks') === '1') return
            root?.setAttribute('data-annotations-hooks', '1')
        } catch (e) { }

        // 点击事件 - 检测高亮点击
        doc.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.classList.contains('epub-highlight')) {
                const noteId = target.getAttribute('data-note-id')
                if (noteId) {
                    const note = notes.value.find(n => n.id === noteId)
                    if (note) {
                        onHighlightClicked?.(note)
                    }
                }
            }
        })

        // 文本选择事件
        let selectionTimeout: ReturnType<typeof setTimeout> | null = null

        const handleSelection = () => {
            if (selectionTimeout) clearTimeout(selectionTimeout)

            selectionTimeout = setTimeout(() => {
                const selection = win.getSelection()
                if (selection && selection.toString().trim().length > 0) {
                    try {
                        const range = selection.getRangeAt(0)
                        const cfi = (rendition.value as any).getRange(range).toString()
                        const text = selection.toString().trim()

                        if (text.length > 0 && cfi) {
                            onTextSelected?.({ text, cfi })
                        }
                    } catch (error) {
                        console.warn('获取选中文本的 CFI 失败:', error)
                    }
                }
            }, 300)
        }

        doc.addEventListener('mouseup', handleSelection)
        doc.addEventListener('touchend', handleSelection)
    }

    return {
        notes,
        setNotes,
        addHighlight,
        removeHighlight,
        restoreHighlights,
        clearSelection,
        bindSelectionEvents,
        setupContentHooks
    }
}
