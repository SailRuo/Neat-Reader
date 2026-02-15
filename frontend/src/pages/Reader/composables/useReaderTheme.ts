import { ref, Ref } from 'vue'
import { Rendition } from 'epubjs'

export interface ThemeColors {
    bg: string
    text: string
}

export interface ReaderThemeOptions {
    theme: Ref<string>
    fontSize: Ref<number>
    lineHeight: Ref<number>
    alignment: Ref<string>
}

// 主题颜色配置
export const themeColors: Record<string, ThemeColors> = {
    light: { bg: '#ffffff', text: '#2c3e50' },
    sepia: { bg: '#f4ecd8', text: '#5b4636' },
    green: { bg: '#e8f5e9', text: '#2d5a3d' },
    dark: { bg: '#1a1a1a', text: '#e8e8e8' }
}

// 对齐映射
const alignmentMap: Record<string, string> = {
    '左对齐': 'left',
    '两端对齐': 'justify'
}

export function useReaderTheme(
    rendition: Ref<Rendition | null>,
    options: ReaderThemeOptions
) {
    const currentThemeKey = ref('user')

    // 生成样式对象
    const generateStyles = () => {
        const colors = themeColors[options.theme.value] || themeColors.light
        const alignValue = alignmentMap[options.alignment.value] || 'justify'

        return {
            'html': {
                'padding': '0 !important',
                'margin': '0 !important',
                'background': `${colors.bg} !important`,
                'width': '100% !important',
                'height': '100% !important',
                'overflow': 'hidden !important'
            },
            'body': {
                'background': `${colors.bg} !important`,
                'color': `${colors.text} !important`,
                'font-size': `${options.fontSize.value}px !important`,
                'line-height': `${options.lineHeight.value} !important`,
                'text-align': `${alignValue} !important`,
                'margin': '0 !important',
                'padding': '40px 60px !important',
                'overflow': 'hidden !important',
                'box-sizing': 'border-box !important',
                'width': '100% !important',
                'height': '100% !important',
                'font-family': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif !important'
            },
            'p': {
                'color': `${colors.text} !important`,
                'text-align': `${alignValue} !important`,
                'line-height': `${options.lineHeight.value} !important`,
                'margin': '0.5em 0 !important',
                'overflow-wrap': 'break-word !important',
                'word-wrap': 'break-word !important'
            },
            'div': {
                'color': `${colors.text} !important`,
                'line-height': `${options.lineHeight.value} !important`,
                'overflow-wrap': 'break-word !important',
                'word-wrap': 'break-word !important'
            },
            'span, li, td, th': {
                'color': `${colors.text} !important`,
                'line-height': `${options.lineHeight.value} !important`
            },
            'h1, h2, h3, h4, h5, h6': {
                'color': `${colors.text} !important`,
                'line-height': '1.4 !important',
                'margin': '1em 0 0.5em 0 !important'
            },
            'a': {
                'color': `${colors.text} !important`,
                'opacity': '0.8',
                'text-decoration': 'underline'
            },
            'img': {
                'max-width': '100% !important',
                'height': 'auto !important',
                'display': 'block !important',
                'margin': '1em auto !important'
            },
            'blockquote': {
                'color': `${colors.text} !important`,
                'border-left': `3px solid ${colors.text}33 !important`,
                'padding-left': '1em !important',
                'margin': '1em 0 !important',
                'font-style': 'italic'
            },
            'code': {
                'background': `${colors.text}11 !important`,
                'color': `${colors.text} !important`,
                'padding': '0.2em 0.4em !important',
                'border-radius': '3px !important',
                'font-family': 'Monaco, Consolas, monospace !important'
            },
            'pre': {
                'background': `${colors.text}11 !important`,
                'color': `${colors.text} !important`,
                'padding': '1em !important',
                'border-radius': '6px !important',
                'overflow-x': 'auto !important',
                'font-family': 'Monaco, Consolas, monospace !important'
            }
        }
    }

    // 应用主题到 rendition
    const applyTheme = () => {
        if (!rendition.value) return

        try {
            const styles = generateStyles()
            const themeKey = `user_${options.theme.value}_${options.fontSize.value}_${options.lineHeight.value}`

            currentThemeKey.value = themeKey
                ; (rendition.value as any).themes.register(themeKey, styles)
                ; (rendition.value as any).themes.select(themeKey)

            console.log('✅ 主题已应用:', themeKey)
        } catch (error) {
            console.error('应用主题失败:', error)
        }
    }

    // 直接更新已渲染内容的样式（无需重新渲染）
    const updateStyles = () => {
        if (!rendition.value) return

        try {
            const colors = themeColors[options.theme.value] || themeColors.light
            const alignValue = alignmentMap[options.alignment.value] || 'justify'

            // 先应用到 themes
            applyTheme()

            // 直接更新已渲染的内容
            const contents = (rendition.value as any).getContents()
            contents.forEach((content: any) => {
                const doc = content.document
                if (doc && doc.body) {
                    doc.body.style.backgroundColor = colors.bg
                    doc.body.style.color = colors.text
                    doc.body.style.fontSize = `${options.fontSize.value}px`
                    doc.body.style.lineHeight = options.lineHeight.value.toString()
                    doc.body.style.textAlign = alignValue

                    // 更新段落
                    doc.querySelectorAll('p').forEach((p: HTMLElement) => {
                        p.style.color = colors.text
                        p.style.lineHeight = options.lineHeight.value.toString()
                        p.style.textAlign = alignValue
                    })

                    // 更新其他元素
                    doc.querySelectorAll('div, span, li, td, th, h1, h2, h3, h4, h5, h6').forEach((el: HTMLElement) => {
                        el.style.color = colors.text
                        el.style.lineHeight = options.lineHeight.value.toString()
                    })

                    // 更新链接
                    doc.querySelectorAll('a').forEach((a: HTMLElement) => {
                        a.style.color = colors.text
                        a.style.opacity = '0.8'
                    })
                }
            })

            console.log('✅ 样式已更新')
        } catch (error) {
            console.error('更新样式失败:', error)
        }
    }

    // 获取当前主题颜色
    const getThemeColors = () => {
        return themeColors[options.theme.value] || themeColors.light
    }

    return {
        currentThemeKey,
        themeColors,
        applyTheme,
        updateStyles,
        getThemeColors
    }
}
