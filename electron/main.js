const { app, BrowserWindow, ipcMain, dialog } = require('electron')
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
