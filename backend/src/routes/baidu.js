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

module.exports = router
