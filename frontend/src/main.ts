import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/global.css'
import ContextMenu from '@imengyu/vue3-context-menu'
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ContextMenu)

app.mount('#app')

// Electron 环境不需要 Wails 初始化
console.log('Neat Reader (Electron) initialized')
