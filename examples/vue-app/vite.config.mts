import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import codemark from '@codemark/vite-plugin'
import { codemarkVueSourcePlugin } from '@codemark/vue/vite-plugin'

export default defineConfig({
  server: { host: true },
  plugins: [
    vue(),
    codemarkVueSourcePlugin(),
    codemark({ serverPort: 3001 }),
  ],
})
