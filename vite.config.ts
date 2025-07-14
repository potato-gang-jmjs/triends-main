import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
  },
  server: {
    port: 8080,
    open: true
  }
}) 