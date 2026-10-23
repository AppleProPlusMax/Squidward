import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
  ],
  server: {
    proxy: {
      '/aramkit-api': {
        target: 'https://api.aramkit.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/aramkit-api/, ''),
        headers: {
          Origin: 'https://aramkit.cn',
          Referer: 'https://aramkit.cn/'
        }
      }
    }
  }
})
