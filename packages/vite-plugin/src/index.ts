import type { Plugin } from 'vite'
import path from 'path'
import fs from 'fs'

export interface CodeMarkPluginOptions {
  serverPort?: number
}

function discoverProviders(): string[] {
  const codemarkDir = path.resolve(process.cwd(), 'node_modules/@codemark')
  if (!fs.existsSync(codemarkDir)) return []

  return fs.readdirSync(codemarkDir).filter(name => {
    try {
      const pkgPath = path.resolve(codemarkDir, name, 'package.json')
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      return pkg.codemark?.metaProvider === true
    } catch {
      return false
    }
  }).map(name => `@codemark/${name}`)
}

export function codemark(options: CodeMarkPluginOptions = {}): Plugin {
  const port = options.serverPort || 3001

  return {
    name: 'vite-plugin-codemark',
    apply: 'serve',

    config() {
      const codemarkDir = path.resolve(process.cwd(), 'node_modules/@codemark')
      const exclude = fs.existsSync(codemarkDir)
        ? fs.readdirSync(codemarkDir).map(name => `@codemark/${name}`)
        : []
      return {
        optimizeDeps: { exclude },
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
        const providers = discoverProviders()
        const imports = [`import { initCodeMark } from '@codemark/ui';`]
        for (const pkg of providers) {
          imports.push(`import '${pkg}';`)
        }
        imports.push(`initCodeMark({ serverPort: ${port} });`)
        return imports.join('\n')
      }
    },

    transformIndexHtml(html) {
      return html.replace('</body>', `<script type="module" src="/@codemark/client"></script>\n</body>`)
    },
  }
}

export default codemark
