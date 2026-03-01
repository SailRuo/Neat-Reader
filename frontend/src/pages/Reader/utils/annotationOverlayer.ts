// Annotation Overlayer - 用于在 foliate-js 中渲染注释高亮
import type { Annotation } from '../../../types/annotation'

export interface AnnotationOverlayer {
  element: SVGSVGElement
  redraw: () => void
  redrawRect: (rect: DOMRect) => void
  hitTest: (event: MouseEvent) => Annotation | null
  destroy: () => void
}

export function createAnnotationOverlayer(
  doc: Document,
  annotations: Annotation[],
  getRangeFromCFI: (annotation: Annotation) => Range | null,
  onAnnotationClick?: (annotation: Annotation, event: MouseEvent) => void
): AnnotationOverlayer {
  // 创建 SVG 容器
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.id = 'neat-reader-annotation-overlay'
  svg.style.position = 'fixed'
  svg.style.top = '0'
  svg.style.left = '0'
  svg.style.width = '100%'
  svg.style.height = '100%'
  svg.style.maxWidth = 'none'
  svg.style.pointerEvents = 'none'
  svg.style.zIndex = '2147483647'

  // 存储每个注释的矩形区域
  const annotationRects = new Map<string, DOMRect[]>()

  // 绘制单个注释
  const drawAnnotation = (annotation: Annotation) => {
    try {
      const range = getRangeFromCFI(annotation)
      if (!range) {
        console.warn('⚠️ [注释绘制] 无法获取 Range:', annotation.id)
        return
      }

      // 验证 Range 是否有效
      if (!range.startContainer || !range.endContainer) {
        console.warn('⚠️ [注释绘制] Range 容器无效:', annotation.id)
        return
      }

      let rects: DOMRect[] = []
      try {
        rects = Array.from(range.getClientRects())
      } catch (e) {
        console.warn('⚠️ [注释绘制] 无法获取 ClientRects:', annotation.id, e)
        return
      }

      if (rects.length === 0) {
        console.warn('⚠️ [注释绘制] Range 没有可见矩形:', annotation.id)
        return
      }

      // 存储矩形区域用于点击测试
      annotationRects.set(annotation.id, rects)

      // 根据注释类型绘制不同的样式
      rects.forEach(rect => {
        // 验证矩形尺寸
        if (rect.width <= 0 || rect.height <= 0) {
          return
        }

        if (annotation.type === 'highlight') {
          // 高亮：绘制半透明矩形
          const highlightRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
          highlightRect.setAttribute('x', rect.left.toString())
          highlightRect.setAttribute('y', rect.top.toString())
          highlightRect.setAttribute('width', rect.width.toString())
          highlightRect.setAttribute('height', rect.height.toString())
          highlightRect.setAttribute('fill', annotation.color || '#ffeb3b')
          highlightRect.setAttribute('fill-opacity', '0.4')
          highlightRect.setAttribute('data-annotation-id', annotation.id)
          highlightRect.style.pointerEvents = 'auto'
          highlightRect.style.cursor = 'pointer'
          highlightRect.style.display = 'block'
          svg.appendChild(highlightRect)
        } else if (annotation.type === 'underline') {
          // 下划线：绘制线条
          const line = doc.createElementNS('http://www.w3.org/2000/svg', 'line')
          line.setAttribute('x1', rect.left.toString())
          line.setAttribute('y1', (rect.bottom - 2).toString())
          line.setAttribute('x2', rect.right.toString())
          line.setAttribute('y2', (rect.bottom - 2).toString())
          line.setAttribute('stroke', annotation.color || '#ff4081')
          line.setAttribute('stroke-width', '2')
          line.setAttribute('data-annotation-id', annotation.id)
          line.style.pointerEvents = 'auto'
          line.style.cursor = 'pointer'
          svg.appendChild(line)
        } else if (annotation.type === 'note') {
          // 笔记：绘制高亮（不添加图标，避免遮挡内容）
          const highlightRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
          highlightRect.setAttribute('x', rect.left.toString())
          highlightRect.setAttribute('y', rect.top.toString())
          highlightRect.setAttribute('width', rect.width.toString())
          highlightRect.setAttribute('height', rect.height.toString())
          highlightRect.setAttribute('fill', annotation.color || '#2196f3')
          highlightRect.setAttribute('fill-opacity', '0.35')
          highlightRect.setAttribute('data-annotation-id', annotation.id)
          highlightRect.style.pointerEvents = 'auto'
          highlightRect.style.cursor = 'pointer'
          svg.appendChild(highlightRect)
        }
      })
    } catch (e) {
      console.warn('⚠️ [注释绘制] 绘制失败:', annotation.id, e)
    }
  }

  // 重绘所有注释
  const redraw = () => {
    // 清空 SVG
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild)
    }
    annotationRects.clear()

    const win = doc.defaultView
    if (win) {
      svg.setAttribute('viewBox', `0 0 ${win.innerWidth} ${win.innerHeight}`)
    }

    // 绘制所有注释
    annotations.forEach(annotation => {
      try {
        drawAnnotation(annotation)
      } catch (e) {
        console.warn('⚠️ [注释] 绘制单个注释失败:', annotation.id, e)
      }
    })
  }

  // 重绘指定区域
  const redrawRect = (_rect: DOMRect) => {
    // 简化实现：重绘所有
    redraw()
  }

  // 点击测试
  const hitTest = (event: MouseEvent): Annotation | null => {
    const target = event.target as SVGElement
    const annotationId = target.getAttribute('data-annotation-id')
    
    if (annotationId) {
      const annotation = annotations.find(a => a.id === annotationId)
      if (annotation && onAnnotationClick) {
        onAnnotationClick(annotation, event)
      }
      return annotation || null
    }

    return null
  }

  const clickHandler = (event: MouseEvent) => {
    hitTest(event)
  }

  // 初始绘制
  redraw()

  // 绑定点击事件（让高亮/下划线可交互）
  // 注意：svg 本身 pointer-events 为 none，但子元素 (rect/line/circle) 为 auto，事件会冒泡到 svg
  svg.addEventListener('click', clickHandler, true)

  // 🎯 核心修复: 监听文档的各种变化，确保高亮在动态排版后依然对齐
  const win = doc.defaultView
  const resizeObserver = win ? new win.ResizeObserver(() => redraw()) : null
  if (resizeObserver) resizeObserver.observe(doc.body)
  
  // 监听滚动（虽然 Foliate 是分页，但某些模式下可能有偏移）
  const scrollHandler = () => redraw()
  doc.addEventListener('scroll', scrollHandler, { passive: true })

  return {
    element: svg,
    redraw,
    redrawRect,
    hitTest,
    // 暴露清理函数
    destroy: () => {
      svg.removeEventListener('click', clickHandler, true)
      if (resizeObserver) resizeObserver.disconnect()
      doc.removeEventListener('scroll', scrollHandler)
    }
  }
}
