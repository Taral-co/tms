import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src')
    }
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Data fetching
          data: ['@tanstack/react-query'],
          // Shared components
          shared: ['@tms/shared']
        }
      }
    },
    minify: 'esbuild',
    target: 'es2020'
  }
})
