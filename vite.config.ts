import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/printed-clipping': {
        target: 'https://prd-api.cservice.io',
        changeOrigin: true,
        secure: false,
      },
      '/scancontrol': {
        target: 'http://170.80.70.78',
        changeOrigin: true,
      },
    },
  },
})
