import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/global.css'
import { initDevToolsShortcuts, diagnoseEnvironment } from './utils/devtools'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Detect and log environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window
const isElectron = typeof window !== 'undefined' && 'electron' in window

if (isTauri) {
  console.log('Neat Reader (Tauri) initialized')
  // 初始化开发者工具快捷键 (F12 或 Ctrl+Shift+I)
  initDevToolsShortcuts()
  // 输出环境诊断信息
  diagnoseEnvironment()
} else if (isElectron) {
  console.log('Neat Reader (Electron) initialized')
} else {
  console.log('Neat Reader (Web) initialized')
}
