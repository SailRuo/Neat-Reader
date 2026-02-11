import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// 修复 foliate-js 中的无效 glob 路径
function fixFoliateGlob() {
  return {
    name: 'fix-foliate-glob',
    transform(code: string, id: string) {
      // 修复 foliate-js 中的无效 glob 模式
      if (id.includes('@ray-d-song/foliate-js') && code.includes('vendor/pdfjs')) {
        return code.replace(/["']vendor\/pdfjs\/\*["']/g, '"./vendor/pdfjs/*"')
      }
      return null
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    fixFoliateGlob()
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // 确保 worker 文件能正确输出
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.includes('pdf.worker')) {
            return 'assets/[name].[hash][extname]'
          }
          return 'assets/[name].[hash][extname]'
        }
      }
    }
  }
})
