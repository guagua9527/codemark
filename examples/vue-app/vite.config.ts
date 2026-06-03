import { defineConfig, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

function codemark(options: { serverPort?: number } = {}): Plugin {
  const port = options.serverPort || 3001

  return {
    name: 'vite-plugin-codemark',
    apply: 'serve',

    config() {
      return {
        optimizeDeps: {
          include: ['@codemark/frontend'],
        },
        resolve: {
          alias: {
            '@codemark/frontend': path.resolve(__dirname, '../../packages/frontend/src/index.ts'),
          },
        },
      }
    },

    resolveId(id) {
      if (id === '/@codemark/client') {
        return '\0/@codemark/client'
      }
    },

    load(id) {
      if (id === '\0/@codemark/client') {
        return `import { initCodeMark } from '@codemark/frontend'; initCodeMark({ serverPort: ${port} });`
      }
    },

    transformIndexHtml(html) {
      return html.replace('</body>', `<script type="module" src="/@codemark/client"></script>\n</body>`)
    },
  }
}

export default defineConfig({
  plugins: [
    vue(),
    codemark({ serverPort: 3001 }),
  ],
})
