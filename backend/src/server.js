const express = require('express')
const cors = require('cors')
const baiduRoutes = require('./routes/baidu')
const logger = require('./utils/logger')

const app = express()
const PORT = 3000

// 中间件
app.use(cors())
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`)
  })
  next()
})

// 路由
app.use('/api/baidu', baiduRoutes)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('服务器错误:', err.message)
  res.status(500).json({ error: err.message })
})

// 启动服务器
app.listen(PORT, () => {
  logger.info(`后端服务器运行在 http://localhost:${PORT}`)
})

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', reason)
})
