// Electron API 类型定义
interface ElectronAPI {
  openDirectory: () => Promise<string>
  openFile: (filters?: any[]) => Promise<string>
  readFile: (filePath: string) => Promise<number[]>
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
  openAuthWindow: (authUrl: string) => Promise<{ success: boolean; code?: string; error?: string }>
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

// 检查是否在 Electron 环境中
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && window.electron !== undefined
}

// 导出封装的 API
export const electronApi = {
  // 打开目录选择对话框
  async openDirectory(): Promise<string> {
    if (!isElectron()) {
      throw new Error('Electron API 不可用')
    }
    return window.electron!.openDirectory()
  },
  
  // 打开文件选择对话框
  async openFile(filters?: any[]): Promise<string> {
    if (!isElectron()) {
      throw new Error('Electron API 不可用')
    }
    return window.electron!.openFile(filters)
  },
  
  // 读取文件
  async readFile(filePath: string): Promise<number[]> {
    if (!isElectron()) {
      throw new Error('Electron API 不可用')
    }
    return window.electron!.readFile(filePath)
  },
  
  // 在外部浏览器中打开 URL
  async openExternal(url: string): Promise<{ success: boolean; error?: string }> {
    if (!isElectron()) {
      throw new Error('Electron API 不可用')
    }
    return window.electron!.openExternal(url)
  },
  
  // 打开授权窗口并监听重定向
  async openAuthWindow(authUrl: string): Promise<{ success: boolean; code?: string; error?: string }> {
    if (!isElectron()) {
      throw new Error('Electron API 不可用')
    }
    return window.electron!.openAuthWindow(authUrl)
  }
}
