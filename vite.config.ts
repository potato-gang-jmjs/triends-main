import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  define: {
    global: 'globalThis'
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer'
    }
  },
  server: {
    port: 8080,
    open: true
  }
}) 