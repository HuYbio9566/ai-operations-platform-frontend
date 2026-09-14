import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const isDemo = mode === 'demo'
  return {
    base: isDemo ? '/ai-operations-platform-frontend/' : '/',
    define: {
      __DEMO_MODE__: JSON.stringify(isDemo),
    },
    plugins: [vue()],
    server: {
      port: 9100,
      proxy: {
        '/api': {
          target: 'http://localhost:9000',
          changeOrigin: true,
        },
        '/media': {
          target: 'http://localhost:9000',
          changeOrigin: true,
        }
      }
    },
  }
})
