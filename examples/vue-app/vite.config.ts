import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import codemark from '@codemark/vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    codemark({ serverPort: 3001 }),
  ],
})
