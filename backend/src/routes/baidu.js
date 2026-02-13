const express = require('express')
const router = express.Router()
const baiduService = require('../services/baiduService')
const logger = require('../utils/logger')

// 获取访问令牌
router.post('/token', async (req, res) => {
  try {
    const { code, clientId, clientSecret, redirectUri } = req.body
    const token = await baiduService.getTokenViaCode(code, clientId, clientSecret, redirectUri)
    res.json(token)
  } catch (error) {
    logger.error('[API] 获取令牌失败:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// 直接代理百度API获取token（避免CORS）
router.post('/token-direct', async (req, res) => {
  try {
    const { code, clientId, clientSecret, redirectUri } = req.body
    
    // 直接调用百度API
    const axios = require('axios')
    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('code', code)
    params.append('client_id', clientId)
    params.append('client_secret', clientSecret)
    params.append('redirect_uri', redirectUri)
    
    const response = await axios.post(
      'https://openapi.baidu.com/oauth/2.0/token',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    
    res.json(response.data)
  } catch (error) {
    logger.error('[API] 直接获取令牌失败:', error.message)
    if (error.response) {
      res.status(error.response.status).json(error.response.data)
    } else {
      res.status(500).json({ error: error.message })
    }
  }
})

// 通过alist API获取token
router.post('/alist-token', async (req, res) => {
  try {
    const { code } = req.body
    
    if (!code) {
      return res.status(400).json({ error: '缺少授权码' })
    }
    
    logger.info(`[AlistToken] 通过alist API获取token, code: ${code}`)
    
    // 调用alist API
    const axios = require('axios')
    const response = await axios.get(
      `https://api.alistgo.com/alist/baidu/get_refresh_token?code=${code}`,
      {
        timeout: 30000,
        validateStatus: function (status) {
          return status < 500 // 只有5xx才抛出异常
        }
      }
    )
    
    logger.info('[AlistToken] alist API响应状态:', response.status)
    logger.info('[AlistToken] alist API响应数据:', response.data)
    
    // 检查响应状态
    if (response.status !== 200) {
      logger.error('[AlistToken] alist API返回非200状态:', response.status)
      return res.status(response.status).json({ 
        error: `alist API返回错误状态: ${response.status}`,
        details: response.data 
      })
    }
    
    // 检查响应数据
    if (response.data && response.data.access_token && response.data.refresh_token) {
      logger.info('[AlistToken] 成功获取token')
      res.json(response.data)
    } else {
      logger.error('[AlistToken] alist API返回数据格式错误:', response.data)
      res.status(400).json({ 
        error: 'alist API返回数据格式错误',
        details: response.data 
      })
    }
  } catch (error) {
    logger.error('[AlistToken] 通过alist获取令牌失败:', error.message)
    
    if (error.response) {
      logger.error('[AlistToken] alist API错误响应:', error.response.data)
      return res.status(error.response.status || 500).json({ 
        error: 'alist API请求失败',
        message: error.message,
        details: error.response.data 
      })
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: '请求超时，请稍后重试' })
    }
    
    res.status(500).json({ 
      error: '服务器内部错误',
      message: error.message 
    })
  }
})

// 刷新令牌
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken, clientId, clientSecret } = req.body
    const newToken = await baiduService.refreshToken(refreshToken, clientId, clientSecret)
    res.json(newToken)
  } catch (error) {
    logger.error('[API] 刷新令牌失败:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// 验证令牌
router.get('/verify', async (req, res) => {
  try {
    const { accessToken } = req.query
    const result = await baiduService.verifyToken(accessToken)
    res.json(result)
  } catch (error) {
    logger.error('[API] 验证令牌失败:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// 获取文件列表
router.get('/files', async (req, res) => {
  try {
    const { accessToken, dir, pageNum, pageSize, order, method, recursion } = req.query
    const files = await baiduService.getFileList(
      accessToken,
      dir,
      parseInt(pageNum) || 1,
      parseInt(pageSize) || 100,
      order || 'name',
      method || 'list',
      parseInt(recursion) || 0
    )
    res.json(files)
  } catch (error) {
    logger.error('[API] 获取文件列表失败:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// 搜索文件
router.get('/search', async (req, res) => {
  try {
    const { accessToken, key, dir, method, recursion } = req.query
    const files = await baiduService.searchFiles(
      accessToken,
      key,
      dir,
      method || 'search',
      parseInt(recursion) || 1
    )
    res.json(files)
  } catch (error) {
    logger.error('[API] 搜索文件失败:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// 获取文件信息
router.get('/fileinfo', async (req, res) => {
  try {
    const { accessToken, fsids } = req.query
    const info = await baiduService.getFileInfo(accessToken, fsids)
    res.json(info)
  } catch (error) {
    logger.error('[API] 获取文件信息失败:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// 下载文件
router.get('/download', async (req, res) => {
  try {
    const { dlink, accessToken } = req.query
    const result = await baiduService.downloadFile(dlink, accessToken)
    res.json(result)
  } catch (error) {
    logger.error('[API] 下载文件失败:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// 上传文件
router.post('/upload', async (req, res) => {
  try {
    const { fileName, fileData, accessToken } = req.body
    
    // fileData 是数组格式，转换为 Buffer
    const fileBuffer = Buffer.from(fileData)
    
    const result = await baiduService.uploadFile(fileName, fileBuffer, accessToken)
    res.json(result)
  } catch (error) {
    logger.error('[API] 上传文件失败:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// 删除文件
router.post('/delete', async (req, res) => {
  try {
    const { accessToken, filePaths } = req.body
    const result = await baiduService.deleteFile(accessToken, filePaths)
    res.json(result)
  } catch (error) {
    logger.error('[API] 删除文件失败:', error.message)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
