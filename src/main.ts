import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 导入全局样式
import './assets/styles/global.css'

const app = createApp(App)

// 使用Pinia进行状态管理
app.use(createPinia())

// 使用Vue Router进行路由管理
app.use(router)

// 挂载应用
app.mount('#app')