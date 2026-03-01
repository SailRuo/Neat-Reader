import { invoke } from '@tauri-apps/api/tauri'

export const baiduApi = {
  // 获取访问令牌
  async getToken(code: string, clientId: string, clientSecret: string, redirectUri: string) {
    return invoke('baidu_get_token', { code, clientId, clientSecret, redirectUri })
  },
  
  // 刷新令牌
  async refreshToken(refreshToken: string, clientId: string, clientSecret: string) {
    return invoke('baidu_refresh_token', { refreshToken, clientId, clientSecret })
  },
  
  // 验证令牌
  async verifyToken(accessToken: string) {
    return invoke('baidu_verify_token', { accessToken })
  },
  
  // 获取文件列表
  async getFileList(
    accessToken: string,
    dir: string,
    pageNum: number = 1,
    pageSize: number = 100,
    order: string = 'name',
    method: string = 'list',
    recursion: number = 0
  ) {
    return invoke('baidu_list_files', {
      accessToken,
      dir,
      pageNum,
      pageSize,
      order,
      method,
      recursion
    })
  },
  
  // 搜索文件
  async searchFiles(
    accessToken: string,
    key: string,
    dir: string,
    method: string = 'search',
    recursion: number = 1
  ) {
    return invoke('baidu_search_files', {
      accessToken,
      key,
      dir,
      method,
      recursion
    })
  },
  
  // 获取文件信息
  async getFileInfo(accessToken: string, fsids: string) {
    return invoke('baidu_get_fileinfo', { accessToken, fsids })
  },
  
  // 下载文件
  async downloadFile(dlink: string, accessToken: string) {
    return invoke('baidu_download_file', { dlink, accessToken })
  },
  
  // 上传文件
  async uploadFile(fileName: string, fileData: number[], accessToken: string) {
    return invoke('baidu_upload_file', { fileName, fileData, accessToken })
  }
}
