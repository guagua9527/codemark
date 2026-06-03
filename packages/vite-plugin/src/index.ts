import type { Plugin } from 'vite'
import path from 'path'

export interface CodeMarkPluginOptions {
  serverPort?: number
}

export function codemark(options: CodeMarkPluginOptions = {}): Plugin {
  const port = options.serverPort || 3001

  return {
    name: 'vite-plugin-codemark',
    apply: 'serve',

    config() {
      return {
        optimizeDeps: {
          include: ['@codemark/ui'],
        },
        resolve: {
          alias: {
            '@codemark/ui': path.resolve(process.cwd(), 'node_modules/@codemark/ui/dist/index.js'),
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
        return `import { initCodeMark } from '@codemark/ui'; initCodeMark({ serverPort: ${port} });`
      }
    },

    transformIndexHtml(html) {
      return html.replace('</body>', `<script type="module" src="/@codemark/client"></script>\n</body>`)
    },
  }
}

export default codemark
