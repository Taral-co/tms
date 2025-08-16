import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'TMSChatWidget',
      fileName: 'chat-widget',
      formats: ['umd']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'chat-widget.js',
        assetFileNames: 'chat-widget.[ext]'
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
})
