/**
 * 开发者工具辅助函数
 * 用于在 Tauri 开发模式下打开开发者工具
 */

/**
 * 打开开发者工具
 * 快捷键: F12 或 Ctrl+Shift+I (Windows/Linux) / Cmd+Option+I (macOS)
 */
export const openDevTools = async () => {
  try {
    // 检查是否在 Tauri 环境
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      // Tauri v2 使用 window API
      const { Window } = await import('@tauri-apps/api/window')
      const appWindow = Window.getCurrent()
      
      // 打开开发者工具
      await appWindow.openDevTools()
      console.log('✓ 开发者工具已打开')
    } else {
      console.warn('⚠️ 不在 Tauri 环境中，无法打开开发者工具')
    }
  } catch (error) {
    console.error('✗ 打开开发者工具失败:', error)
  }
}

/**
 * 关闭开发者工具
 */
export const closeDevTools = async () => {
  try {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { Window } = await import('@tauri-apps/api/window')
      const appWindow = Window.getCurrent()
      
      await appWindow.closeDevTools()
      console.log('✓ 开发者工具已关闭')
    }
  } catch (error) {
    console.error('✗ 关闭开发者工具失败:', error)
  }
}

/**
 * 切换开发者工具
 */
export const toggleDevTools = async () => {
  try {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { Window } = await import('@tauri-apps/api/window')
      const appWindow = Window.getCurrent()
      
      // Tauri v2 没有直接的 toggle 方法，我们先尝试打开
      await appWindow.openDevTools()
      console.log('✓ 开发者工具已切换')
    }
  } catch (error) {
    console.error('✗ 切换开发者工具失败:', error)
  }
}

/**
 * 初始化开发者工具快捷键
 * 在应用启动时调用
 */
export const initDevToolsShortcuts = () => {
  if (typeof window === 'undefined') return

  // 监听键盘事件
  window.addEventListener('keydown', (event) => {
    // F12
    if (event.key === 'F12') {
      event.preventDefault()
      toggleDevTools()
      return
    }

    // Ctrl+Shift+I (Windows/Linux) 或 Cmd+Option+I (macOS)
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const modifierKey = isMac ? event.metaKey : event.ctrlKey
    const secondModifier = isMac ? event.altKey : event.shiftKey

    if (modifierKey && secondModifier && event.key.toLowerCase() === 'i') {
      event.preventDefault()
      toggleDevTools()
      return
    }
  })

  console.log('✓ 开发者工具快捷键已初始化 (F12 或 Ctrl+Shift+I)')
}

/**
 * 环境诊断函数
 * 用于调试环境检测问题
 */
export const diagnoseEnvironment = () => {
  console.log('=== 环境诊断 ===')
  console.log('window.__TAURI__:', typeof window !== 'undefined' && '__TAURI__' in window)
  console.log('window.electron:', typeof window !== 'undefined' && 'electron' in window)
  console.log('window.location.href:', window.location.href)
  console.log('navigator.userAgent:', navigator.userAgent)
  
  // 检查 Tauri API 是否可用
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    console.log('✓ Tauri 环境已检测到')
    console.log('window.__TAURI__:', (window as any).__TAURI__)
  } else {
    console.log('✗ 未检测到 Tauri 环境')
  }
}
