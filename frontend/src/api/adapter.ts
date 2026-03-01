/**
 * 环境检测和文件系统 API 适配器
 */
import { invoke } from '@tauri-apps/api/tauri'

/**
 * 检测运行环境
 */
export function detectEnvironment(): 'tauri' | 'electron' | 'browser' {
  if (typeof window === 'undefined') {
    return 'browser'
  }
  
  if ('__TAURI__' in window) {
    return 'tauri'
  }
  
  if ('electron' in window) {
    return 'electron'
  }
  
  return 'browser'
}

/**
 * 文件系统 API（仅 Tauri）
 */
export const api = {
  /**
   * 打开 OAuth 授权窗口
   */
  async openAuthWindow(authUrl: string): Promise<{ success: boolean; code?: string; error?: string }> {
    return invoke('open_auth_window', { authUrl })
  },

  /**
   * 在外部浏览器打开 URL
   */
  async openExternal(url: string): Promise<{ success: boolean }> {
    return invoke('open_external', { url })
  },

  /**
   * 打开目录选择器
   */
  async openDirectory(): Promise<string | null> {
    return invoke('open_directory')
  },

  /**
   * 读取文件
   */
  async readFile(path: string): Promise<Uint8Array> {
    return invoke('read_file', { path })
  },

  /**
   * 写入文件
   */
  async writeFile(path: string, data: Uint8Array): Promise<void> {
    return invoke('write_file', { path, data: Array.from(data) })
  },

  /**
   * 打开文件选择器
   */
  async openFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null> {
    return invoke('open_file', { filters })
  }
}
