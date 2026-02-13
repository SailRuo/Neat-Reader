// API 适配器 - 统一封装 Electron API 和后端 HTTP API
import { baiduApi } from './baidu'
import { isElectron } from '@/electron'

// 统一的 API 适配器
export const api = {
  // 百度网盘 API
  async getTokenViaCode(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<any> {
    const result = await baiduApi.getToken(code, clientId, clientSecret, redirectUri)
    return result
  },

  async refreshToken(refreshToken: string, clientId: string, clientSecret: string): Promise<any> {
    const result = await baiduApi.refreshToken(refreshToken, clientId, clientSecret)
    return result
  },

  async verifyToken(accessToken: string): Promise<any> {
    const result = await baiduApi.verifyToken(accessToken)
    return result
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
    const result = await baiduApi.getFileList(accessToken, dir, pageNum, pageSize, order, method, recursion)
    return result
  },

  async searchFiles(
    accessToken: string,
    key: string,
    dir: string,
    method: string = 'search',
    recursion: number = 1
  ): Promise<any> {
    const result = await baiduApi.searchFiles(accessToken, key, dir, method, recursion)
    return result
  },

  async getFileInfo(accessToken: string, fsids: string): Promise<any> {
    const result = await baiduApi.getFileInfo(accessToken, fsids)
    return result
  },

  async downloadFile(dlink: string, accessToken: string): Promise<any> {
    const result = await baiduApi.downloadFile(dlink, accessToken)
    return result
  },

  async uploadFile(fileName: string, fileData: number[], accessToken: string): Promise<any> {
    const result = await baiduApi.uploadFile(fileName, fileData, accessToken)
    return result
  },

  async deleteFile(accessToken: string, filePaths: string[]): Promise<any> {
    const result = await baiduApi.deleteFile(accessToken, filePaths)
    return result
  },

  // 文件系统 API (通过 Electron)
  async openDirectory(): Promise<string> {
    if (!isElectron()) {
      throw new Error('Electron API 不可用')
    }
    return window.electron!.openDirectory()
  },

  async readFile(filePath: string): Promise<number[]> {
    if (!isElectron()) {
      throw new Error('Electron API 不可用')
    }
    return window.electron!.readFile(filePath)
  },

  async selectFile(): Promise<string> {
    if (!isElectron()) {
      throw new Error('Electron API 不可用')
    }
    return window.electron!.openFile([
      { name: '电子书', extensions: ['epub', 'pdf', 'txt'] }
    ])
  }
}
