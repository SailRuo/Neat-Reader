const { exec } = require('child_process')
const logger = require('./logger')

/**
 * 检查端口是否被占用并尝试终止占用进程
 * @param {number} port - 要检查的端口号
 * @returns {Promise<boolean>} - 是否成功释放端口
 */
async function killPortProcess(port) {
  return new Promise((resolve) => {
    const platform = process.platform
    let command

    if (platform === 'win32') {
      // Windows: 使用 netstat 查找占用端口的进程
      command = `netstat -ano | findstr :${port}`
    } else {
      // macOS/Linux: 使用 lsof 查找占用端口的进程
      command = `lsof -ti:${port}`
    }

    exec(command, (error, stdout) => {
      if (error || !stdout) {
        // 端口未被占用
        logger.info(`端口 ${port} 未被占用`)
        resolve(true)
        return
      }

      // 提取进程 ID
      let pid
      if (platform === 'win32') {
        const lines = stdout.trim().split('\n')
        const lastLine = lines[lines.length - 1]
        const parts = lastLine.trim().split(/\s+/)
        pid = parts[parts.length - 1]
      } else {
        pid = stdout.trim().split('\n')[0]
      }

      if (!pid) {
        logger.warn(`无法找到占用端口 ${port} 的进程`)
        resolve(false)
        return
      }

      logger.info(`发现进程 ${pid} 占用端口 ${port}，正在终止...`)

      // 终止进程
      const killCommand = platform === 'win32' 
        ? `taskkill /F /PID ${pid}`
        : `kill -9 ${pid}`

      exec(killCommand, (killError) => {
        if (killError) {
          logger.error(`终止进程 ${pid} 失败:`, killError.message)
          resolve(false)
        } else {
          logger.info(`成功终止进程 ${pid}`)
          // 等待一小段时间确保端口释放
          setTimeout(() => resolve(true), 1000)
        }
      })
    })
  })
}

module.exports = { killPortProcess }
