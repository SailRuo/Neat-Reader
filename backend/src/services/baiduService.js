const axios = require('axios')
const FormData = require('form-data')
const logger = require('../utils/logger')

const APP_NAME = 'Neat Reader'

// 创建带日志的 axios 实例
const client = axios.create({
  timeout: 30000
})

// 请求拦截器
client.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: Date.now() }
    logger.request(config.method.toUpperCase(), config.url, 0)
    return config
  },
  (error) => {
    logger.error('请求错误:', error.message)
    return Promise.reject(error)
  }
)

// 响应拦截器
client.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata.startTime
    logger.response(response.status, duration)
    return response
  },
  (error) => {
    if (error.config) {
      const duration = Date.now() - error.config.metadata.startTime
      logger.error(`请求失败: ${error.message} - ${duration}ms`)
    }
    return Promise.reject(error)
  }
)

// 获取百度网盘路径
function getBaiduPath(relativePath) {
  const cleanPath = relativePath.replace(/^\/+/, '')
  if (!cleanPath) {
    return `/apps/${APP_NAME}`
  }
  return `/apps/${APP_NAME}/${cleanPath}`
}

// 百度网盘服务
const baiduService = {
  // 通过授权码获取访问令牌
  async getTokenViaCode(code, clientId, clientSecret, redirectUri) {
    try {
      logger.info('[Token] 通过授权码获取访问令牌')
      
      const params = new URLSearchParams()
      params.append('grant_type', 'authorization_code')
      params.append('code', code)
      params.append('client_id', clientId)
      params.append('client_secret', clientSecret)
      params.append('redirect_uri', redirectUri)
      
      const response = await client.post(
        'https://openapi.baidu.com/oauth/2.0/token',
        params
      )
      
      return response.data
    } catch (error) {
      logger.error('[Token] 获取令牌失败:', error.message)
      throw error
    }
  },
  
  // 刷新访问令牌
  async refreshToken(refreshToken, clientId, clientSecret) {
    try {
      logger.info('[Token] 刷新访问令牌')
      
      const params = new URLSearchParams()
      params.append('grant_type', 'refresh_token')
      params.append('refresh_token', refreshToken)
      params.append('client_id', clientId)
      params.append('client_secret', clientSecret)
      
      const response = await client.post(
        'https://openapi.baidu.com/oauth/2.0/token',
        params
      )
      
      return response.data
    } catch (error) {
      logger.error('[Token] 刷新令牌失败:', error.message)
      throw error
    }
  },
  
  // 验证令牌
  async verifyToken(accessToken) {
    try {
      logger.info('[Token] 验证令牌')
      
      const response = await client.get(
        'https://pan.baidu.com/rest/2.0/xpan/nas',
        {
          params: {
            method: 'uinfo',
            access_token: accessToken
          }
        }
      )
      
      return response.data
    } catch (error) {
      logger.error('[Token] 验证令牌失败:', error.message)
      throw error
    }
  },
  
  // 获取文件列表
  async getFileList(accessToken, dir, pageNum = 1, pageSize = 100, order = 'name', method = 'list', recursion = 0) {
    try {
      logger.info(`[FileList] 获取文件列表: ${dir}`)
      
      const response = await client.get(
        'https://pan.baidu.com/rest/2.0/xpan/file',
        {
          params: {
            access_token: accessToken,
            dir,
            pageNum,
            pageSize,
            order,
            method,
            recursion
          }
        }
      )
      
      return response.data
    } catch (error) {
      logger.error('[FileList] 获取文件列表失败:', error.message)
      throw error
    }
  },
  
  // 搜索文件
  async searchFiles(accessToken, key, dir, method = 'search', recursion = 1) {
    try {
      logger.info(`[Search] 搜索文件: ${key}`)
      
      const response = await client.get(
        'https://pan.baidu.com/rest/2.0/xpan/file',
        {
          params: {
            access_token: accessToken,
            key,
            dir,
            method,
            recursion
          }
        }
      )
      
      return response.data
    } catch (error) {
      logger.error('[Search] 搜索文件失败:', error.message)
      throw error
    }
  },
  
  // 获取文件信息（包含下载链接）
  async getFileInfo(accessToken, fsids) {
    try {
      logger.info(`[FileInfo] 获取文件信息: ${fsids}`)
      
      const response = await client.get(
        'https://pan.baidu.com/rest/2.0/xpan/file',
        {
          params: {
            method: 'filemetas',
            access_token: accessToken,
            fsids: `[${fsids}]`,
            dlink: '1'
          }
        }
      )
      
      return response.data
    } catch (error) {
      logger.error('[FileInfo] 获取文件信息失败:', error.message)
      throw error
    }
  },
  
  // 下载文件
  async downloadFile(dlink, accessToken) {
    try {
      logger.info('[Download] 开始下载文件')
      
      const downloadURL = `${dlink}&access_token=${accessToken}`
      
      const response = await client.get(downloadURL, {
        headers: {
          'User-Agent': 'pan.baidu.com'
        },
        responseType: 'arraybuffer'
      })
      
      logger.info(`[Download] 下载成功，文件大小: ${response.data.byteLength} 字节`)
      
      // 转换为数组格式（与 Go 版本保持一致）
      const data = Array.from(new Uint8Array(response.data))
      
      return {
        success: true,
        data
      }
    } catch (error) {
      logger.error('[Download] 下载文件失败:', error.message)
      return {
        success: false,
        error: error.message
      }
    }
  },
  
  // 获取上传域名
  async getUploadDomain(accessToken, filePath) {
    try {
      logger.info('[Upload] 获取上传域名')
      
      const response = await client.get(
        'https://d.pcs.baidu.com/rest/2.0/pcs/file',
        {
          params: {
            method: 'locateupload',
            appid: '250528',
            access_token: accessToken,
            path: filePath,
            upload_version: '2.0',
            uploadid: 'temp'
          }
        }
      )
      
      if (response.data.error_code) {
        throw new Error(`获取上传域名失败: ${response.data.error_msg}`)
      }
      
      if (!response.data.servers || response.data.servers.length === 0) {
        throw new Error('没有可用的上传服务器')
      }
      
      return response.data.servers[0].server
    } catch (error) {
      logger.error('[Upload] 获取上传域名失败:', error.message)
      throw error
    }
  },
  
  // 上传文件
  async uploadFile(fileName, fileBuffer, accessToken) {
    try {
      logger.info(`[Upload] 开始上传文件: ${fileName}, 大小: ${fileBuffer.length}`)
      
      const baiduPath = getBaiduPath(fileName)
      logger.info(`[Upload] 百度路径: ${baiduPath}`)
      
      // 获取上传域名
      const uploadDomain = await this.getUploadDomain(accessToken, baiduPath)
      
      // 构建上传 URL
      const uploadURL = `${uploadDomain}/rest/2.0/pcs/file?method=upload&access_token=${accessToken}&path=${encodeURIComponent(baiduPath)}&ondup=overwrite`
      
      // 创建表单数据
      const formData = new FormData()
      formData.append('file', fileBuffer, { filename: 'upload' })
      
      // 上传文件
      const response = await client.post(uploadURL, formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      })
      
      if (response.data.error_code) {
        logger.error(`[Upload] 上传失败: error_code=${response.data.error_code}, error_msg=${response.data.error_msg}`)
        return {
          error: `上传失败: ${response.data.error_msg}`,
          error_code: response.data.error_code,
          error_msg: response.data.error_msg
        }
      }
      
      logger.info('[Upload] 上传成功')
      return response.data
    } catch (error) {
      logger.error('[Upload] 上传文件失败:', error.message)
      return {
        error: error.message
      }
    }
  }
}

module.exports = baiduService
