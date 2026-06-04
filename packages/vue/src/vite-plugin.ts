import type { Plugin } from 'vite'
import { parse } from '@vue/compiler-sfc'
import path from 'path'

/**
 * Vite plugin that injects source location into Vue SFC template root elements.
 * Adds `data-codemark-file` and `data-codemark-line` attributes at compile time
 * so the runtime meta provider can report accurate source positions.
 */
export const codemarkVueSourcePlugin = (): Plugin => ({
  name: 'codemark-vue-source',
  apply: 'serve',

  transform(code, id) {
    if (!id.endsWith('.vue')) return null

    const { descriptor } = parse(code, { filename: id })
    if (!descriptor.template) return null

    const tpl = descriptor.template
    const content = tpl.content
    const startOffset = tpl.loc.start.offset

    // Find root element opening tag: <tagName ...> or <tagName .../>
    const match = content.match(/^(\s*<)([a-zA-Z][\w-]*)([\s/>])/)
    if (!match) return null

    const pos = content.indexOf(match[0]) + match[1].length + match[2].length
    const absPos = startOffset + pos

    // Calculate line number of the root element
    const beforeRoot = code.slice(0, absPos)
    const line = beforeRoot.split('\n').length

    const relPath = path.relative(process.cwd(), id)

    const injection = ` data-codemark-file="${relPath}" data-codemark-line="${line}"`
    return code.slice(0, absPos) + injection + code.slice(absPos)
  },
})
