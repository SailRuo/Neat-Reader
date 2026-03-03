import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/global.css'
import { qwenTokenManager } from './utils/qwenTokenManager'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// 💡 核心修复：在 Pinia 激活并挂载应用后，手动初始化 Token Manager
qwenTokenManager.init()

console.log('Neat Reader initialized')
