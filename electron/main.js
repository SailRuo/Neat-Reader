const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow

// 创建窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#f5f7fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, '../build/icon.png')
  })
  
  // 开发环境加载 Vite 服务器，生产环境加载打包文件
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'))
  }
  
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC 处理：打开目录选择对话框
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择文件夹'
  })
  return result.canceled ? '' : result.filePaths[0]
})

// IPC 处理：打开文件选择对话框
ipcMain.handle('dialog:openFile', async (event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [],
    title: '选择文件'
  })
  return result.canceled ? '' : result.filePaths[0]
})

// IPC 处理：读取文件
ipcMain.handle('fs:readFile', async (event, filePath) => {
  const fs = require('fs').promises
  try {
    const data = await fs.readFile(filePath)
    return Array.from(data)
  } catch (error) {
    console.error('读取文件失败:', error)
    throw error
  }
})

// IPC 处理：在外部浏览器中打开 URL
ipcMain.handle('shell:openExternal', async (event, url) => {
  try {
    console.log('打开外部链接:', url)
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    console.error('打开外部链接失败:', error)
    return { success: false, error: error.message }
  }
})

// IPC 处理：打开授权窗口并监听重定向
ipcMain.handle('auth:openWindow', async (event, authUrl) => {
  console.log('=== Electron 主进程：开始处理授权窗口 ===')
  console.log('授权URL:', authUrl)
  
  return new Promise((resolve) => {
    try {
      console.log('创建授权窗口...')
      // 创建授权窗口
      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        parent: mainWindow,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true
        }
      })
      
      console.log('✓ 授权窗口创建成功')
      
      // 加载授权URL
      console.log('加载授权URL...')
      authWindow.loadURL(authUrl)
      console.log('✓ 开始加载授权页面')
      
      // 监听URL变化
      authWindow.webContents.on('will-redirect', (event, navigationUrl) => {
        console.log('检测到页面重定向:', navigationUrl)
        
        // 检查是否是回调URL
        if (navigationUrl.includes('alistgo.com/tool/baidu/callback')) {
          console.log('✓ 检测到回调URL，开始解析参数')
          try {
            const url = new URL(navigationUrl)
            const code = url.searchParams.get('code')
            const error = url.searchParams.get('error')
            
            console.log('URL参数解析结果:', { code: code ? '已获取' : '未找到', error })
            
            if (code) {
              console.log('✓ 成功获取授权码:', code)
              resolve({ success: true, code })
            } else if (error) {
              console.log('✗ 授权错误:', error)
              resolve({ success: false, error })
            } else {
              console.log('✗ 未找到code或error参数')
              resolve({ success: false, error: '未找到授权码' })
            }
            
            console.log('关闭授权窗口...')
            authWindow.close()
          } catch (parseError) {
            console.error('✗ URL解析失败:', parseError)
            resolve({ success: false, error: 'URL解析失败: ' + parseError.message })
            authWindow.close()
          }
        } else {
          console.log('非回调URL，继续等待...')
        }
      })
      
      // 监听窗口关闭
      authWindow.on('closed', () => {
        console.log('授权窗口被关闭')
        resolve({ success: false, error: '用户取消授权' })
      })
      
      // 处理加载错误
      authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('✗ 授权页面加载失败:', errorCode, errorDescription)
        resolve({ success: false, error: `页面加载失败: ${errorDescription}` })
        authWindow.close()
      })
      
      // 页面加载完成
      authWindow.webContents.on('did-finish-load', () => {
        console.log('✓ 授权页面加载完成')
      })
      
    } catch (error) {
      console.error('✗ 创建授权窗口失败:', error)
      resolve({ success: false, error: '创建窗口失败: ' + error.message })
    }
  })
})

// 应用准备就绪
app.whenReady().then(() => {
  // 开发环境下，后端由 npm run dev 启动，这里只创建窗口
  // 生产环境下，需要等待后端启动（TODO: 生产环境需要单独处理）
  if (isDev) {
    // 开发环境：等待前端服务器启动
    setTimeout(() => {
      createWindow()
    }, 1000)
  } else {
    // 生产环境：需要先启动后端服务器
    // TODO: 生产环境需要启动后端
    createWindow()
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error)
})
