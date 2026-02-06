import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../assets/react-gallery'),
    emptyOutDir: true,
    assetsDir: '',
    rollupOptions: {
      output: {
        entryFileNames: 'react-gallery.js',
        chunkFileNames: 'react-gallery.[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'react-gallery.css'
          }
          return 'react-gallery.[ext]'
        },
      },
    },
  },
})
