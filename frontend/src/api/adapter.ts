// API 适配器 - 统一封装 Electron API、Tauri API 和后端 HTTP API
import { baiduApi } from './baidu'
import { isElectron } from '@/electron'
import { isTauri, tauriApi } from './tauri-adapter'

/**
 * 检测当前运行环境
 */
export const detectEnvironment = () => {
  if (isTauri()) return 'tauri'
  if (isElectron()) return 'electron'
  return 'web'
}

/**
 * 统一的 API 适配器
 * 自动检测运行环境（Tauri/Electron/Web）并调用相应的 API
 */
export const api = {
  // 百度网盘 API (HTTP-based, works in all environments)
  async getTokenViaCode(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<any> {
    return await baiduApi.getToken(code, clientId, clientSecret, redirectUri)
  },

  async refreshToken(refreshToken: string, clientId: string, clientSecret: string): Promise<any> {
    return await baiduApi.refreshToken(refreshToken, clientId, clientSecret)
  },

  async verifyToken(accessToken: string): Promise<any> {
    return await baiduApi.verifyToken(accessToken)
  },

  async getFileList(
    accessToken: string,
    dir: string = '/',
    pageNum: number = 1,
    pageSize: number = 100,
    order: string = 'name',
    method: string = 'list',
    recursion: number = 0
  ): Promise<any> {
    return await baiduApi.getFileList(accessToken, dir, pageNum, pageSize, order, method, recursion)
  },

  async searchFiles(
    accessToken: string,
    key: string,
    dir: string,
    method: string = 'search',
    recursion: number = 1
  ): Promise<any> {
    return await baiduApi.searchFiles(accessToken, key, dir, method, recursion)
  },

  async getFileInfo(accessToken: string, fsids: string): Promise<any> {
    return await baiduApi.getFileInfo(accessToken, fsids)
  },

  async downloadFile(dlink: string, accessToken: string): Promise<any> {
    return await baiduApi.downloadFile(dlink, accessToken)
  },

  async uploadFile(fileName: string, fileData: number[], accessToken: string): Promise<any> {
    return await baiduApi.uploadFile(fileName, fileData, accessToken)
  },

  async createDirectory(accessToken: string, dir: string): Promise<any> {
    return await baiduApi.createDirectory(accessToken, dir)
  },

  async deleteFile(accessToken: string, filePaths: string[]): Promise<any> {
    return await baiduApi.deleteFile(accessToken, filePaths)
  },

  // 文件系统 API (platform-specific: Tauri or Electron)
  async openDirectory(): Promise<string> {
    if (isTauri()) {
      const result = await tauriApi.openDirectory()
      return result || ''
    } else if (isElectron()) {
      return window.electron!.openDirectory()
    }
    throw new Error('Platform API not available')
  },

  async readFile(filePath: string): Promise<number[]> {
    if (isTauri()) {
      return await tauriApi.readFile(filePath)
    } else if (isElectron()) {
      return window.electron!.readFile(filePath)
    }
    throw new Error('Platform API not available')
  },

  async selectFile(): Promise<string> {
    if (isTauri()) {
      const result = await tauriApi.selectFile()
      return result || ''
    } else if (isElectron()) {
      return window.electron!.openFile([
        { name: '电子书', extensions: ['epub', 'pdf', 'txt'] }
      ])
    }
    throw new Error('Platform API not available')
  },

  // OAuth API (platform-specific: Tauri or Electron)
  async openAuthWindow(authUrl: string): Promise<{ success: boolean; code?: string; error?: string }> {
    if (isTauri()) {
      return await tauriApi.openAuthWindow(authUrl)
    } else if (isElectron()) {
      return window.electron!.openAuthWindow(authUrl)
    }
    throw new Error('Platform API not available')
  },

  async openExternal(url: string): Promise<{ success: boolean; error?: string }> {
    if (isTauri()) {
      return await tauriApi.openExternal(url)
    } else if (isElectron()) {
      return window.electron!.openExternal(url)
    }
    throw new Error('Platform API not available')
  }
}
