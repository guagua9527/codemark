import { defineConfig, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

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

export default defineConfig({
  plugins: [
    vue(),
    codemark({ serverPort: 3001 }),
  ],
})
