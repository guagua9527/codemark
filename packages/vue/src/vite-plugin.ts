import type { Plugin } from 'vite'
import { parse } from '@vue/compiler-sfc'
import path from 'path'
import { DATA_CODEMARK_FILE, DATA_CODEMARK_LINE } from '@codemark/core/common'

const findOpenTags = (content: string) => {
  const tags: { pos: number; name: string }[] = []
  const regex = /<([a-zA-Z][\w-]*)([\s>])/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    if (match[0].endsWith('/>')) continue
    tags.push({ pos: match.index + 1 + match[1].length, name: match[1] })
  }
  return tags
}

/**
 * Vite plugin that injects source location into Vue SFC template elements.
 * Adds `data-codemark-file` and `data-codemark-line` attributes at compile time
 * so the runtime meta provider can report accurate source positions.
 */
export const codemarkVueSourcePlugin = (): Plugin => ({
  name: 'codemark-vue-source',
  apply: 'serve',
  enforce: 'pre',

  transform(code, id) {
    if (!id.endsWith('.vue')) return null

    const { descriptor } = parse(code, { filename: id })
    if (!descriptor.template) return null

    const tpl = descriptor.template
    const startOffset = tpl.loc.start.offset
    const relPath = path.relative(process.cwd(), id)

    const tags = findOpenTags(tpl.content)
    if (tags.length === 0) return null

    // Inject in reverse order so earlier positions remain valid
    let result = code
    for (let i = tags.length - 1; i >= 0; i--) {
      const absPos = startOffset + tags[i].pos
      const line = result.slice(0, absPos).split('\n').length
      const injection = ` ${DATA_CODEMARK_FILE}="${relPath}" ${DATA_CODEMARK_LINE}="${line}"`
      result = result.slice(0, absPos) + injection + result.slice(absPos)
    }
    console.log(`[CodeMark] Injected source location into ${tags.length} element(s): ${relPath}`)
    return result
  },
})
