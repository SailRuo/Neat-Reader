import axios from 'axios'

const API_BASE = 'http://localhost:3001/api'

// 创建 axios 实例
const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000
})

// 响应拦截器
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // 服务器返回了错误响应
      console.error('API 请求失败:', error.response.status, error.response.data)
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('API 请求失败: 无法连接到后端服务器', error.message)
    } else {
      // 其他错误
      console.error('API 请求失败:', error.message)
    }
    throw error
  }
)

export const baiduApi = {
  // 获取访问令牌
  async getToken(code: string, clientId: string, clientSecret: string, redirectUri: string) {
    return client.post('/baidu/token', { code, clientId, clientSecret, redirectUri })
  },
  
  // 刷新令牌
  async refreshToken(refreshToken: string, clientId: string, clientSecret: string) {
    return client.post('/baidu/refresh', { refreshToken, clientId, clientSecret })
  },
  
  // 验证令牌
  async verifyToken(accessToken: string) {
    return client.get('/baidu/verify', { params: { accessToken } })
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
    return client.get('/baidu/files', {
      params: { accessToken, dir, pageNum, pageSize, order, method, recursion }
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
    return client.get('/baidu/search', {
      params: { accessToken, key, dir, method, recursion }
    })
  },
  
  // 获取文件信息
  async getFileInfo(accessToken: string, fsids: string) {
    return client.get('/baidu/fileinfo', {
      params: { accessToken, fsids }
    })
  },
  
  // 下载文件
  async downloadFile(dlink: string, accessToken: string) {
    return client.get('/baidu/download', {
      params: { dlink, accessToken }
    })
  },
  
  // 上传文件
  async uploadFile(fileName: string, fileData: number[], accessToken: string) {
    return client.post('/baidu/upload', { fileName, fileData, accessToken })
  }
}
