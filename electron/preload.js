const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 给前端
contextBridge.exposeInMainWorld('electron', {
  // 打开目录选择对话框
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  
  // 打开文件选择对话框
  openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  
  // 读取文件
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath)
})
