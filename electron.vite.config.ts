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
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src')
      }
    }
  }
})
