import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router/index.js'
import { setupHttpAuthInterceptor } from './http.js'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus)
app.use(router)
// 令牌过期全局拦截：注入 fetch 覆写与 axios 拦截器
setupHttpAuthInterceptor(router)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.mount('#app')
