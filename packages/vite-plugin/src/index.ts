import type { Plugin } from 'vite'

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
          include: ['@codemark/frontend'],
        },
      }
    },

    transformIndexHtml(html) {
      return html.replace('</body>', `
<script type="module">
  import { initCodeMark } from '@codemark/frontend'
  initCodeMark({ serverPort: ${port} })
</script>
</body>`)
    },
  }
}

export default codemark
