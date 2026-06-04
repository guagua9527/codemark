import type { Plugin } from 'vite'
import path from 'path'
import fs from 'fs'
import { DEFAULT_SERVER_PORT, type CodeMarkBaseOptions } from '@codemark/core/common'

export interface CodeMarkPluginOptions extends CodeMarkBaseOptions {
  /** Auto-discover and import @codemark/* meta providers. Default: true */
  autoDiscoverProviders?: boolean
}

function discoverProviders(): string[] {
  const codemarkDir = path.resolve(process.cwd(), 'node_modules/@codemark')
  if (!fs.existsSync(codemarkDir)) {
    console.log('[CodeMark] No node_modules/@codemark directory found')
    return []
  }

  const dirs = fs.readdirSync(codemarkDir)
  console.log('[CodeMark] Found @codemark packages:', dirs)

  const providers = dirs.filter(name => {
    try {
      const pkgPath = path.resolve(codemarkDir, name, 'package.json')
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      const isProvider = pkg.codemark?.metaProvider === true
      console.log(`[CodeMark]   ${name}: metaProvider=${isProvider}`)
      return isProvider
    } catch {
      return false
    }
  }).map(name => `@codemark/${name}`)

  console.log('[CodeMark] Discovered providers:', providers)
  return providers
}

export function codemark(options: CodeMarkPluginOptions = {}): Plugin {
  const port = options.serverPort || DEFAULT_SERVER_PORT

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
        const toCode = (v: string | string[] | undefined, fallback: string) =>
          v === undefined ? `'${fallback}'`
          : Array.isArray(v) ? `[${v.map(r => `'${r}'`).join(', ')}]`
          : `'${v}'`
        const imports = [`import { initCodeMark } from '@codemark/ui';`]
        for (const pkg of providers) {
          imports.push(`import '${pkg}';`)
        }
        imports.push(`initCodeMark({ serverPort: ${port}, includeSource: ${toCode(options.includeSource, 'src/**')}, excludeSource: ${toCode(options.excludeSource, 'node_modules/**')} });`)
        return imports.join('\n')
      }
    },

    transformIndexHtml(html) {
      return html.replace('</body>', `<script type="module" src="/@codemark/client"></script>\n</body>`)
    },
  }
}

export default codemark
