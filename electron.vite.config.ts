import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, swcPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [swcPlugin()]
  },
  preload: {},
  renderer: {
    plugins: [tailwindcss(), react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: '127.0.0.1',
        clientPort: 5173
      },
      watch: {
        usePolling: true,
        interval: 200
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src')
      }
    }
  }
})
