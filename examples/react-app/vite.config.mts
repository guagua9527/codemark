import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import codemark from '@codemark/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    codemark({ serverPort: 3001 }),
  ],
})
