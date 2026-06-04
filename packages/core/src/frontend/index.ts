export { reportError } from './error-reporter.js'

export interface ComponentMeta {
  filePath: string
  line: number
  column: number
  componentName: string
  componentRootElement: Element | null
  targetElement: Element | null
  /** Framework-specific component instance (Vue component instance, React fiber node, etc.) */
  componentInstance?: any
  /** Identifier for the instance type, e.g. 'vue', 'react', 'html' */
  instanceType?: string
  depth?: number
  maxDepth?: number
}

export interface ComponentMetaProvider {
  getComponentMeta(element: Element, depth?: number): ComponentMeta | null
}

const providers: { name: string; provider: ComponentMetaProvider }[] = []

export const registerMetaProvider = (name: string, provider: ComponentMetaProvider) => {
  providers.push({ name, provider })
}

export const getRegisteredProviders = () => providers

const globToRegex = (pattern: string): RegExp => {
  const escaped = pattern.replace(/[-[\]{}()+?.\\^$|]/g, c => c === '*' ? '' : `\\${c}`)
  const regexStr = escaped
    .replace(/\*\*\/?/g, '(.+)?')
    .replace(/\*/g, '[^/]*')
  return new RegExp(`^${regexStr}$`)
}

let _includePatterns: RegExp[] = []
let _excludePatterns: RegExp[] = []

export const setSourceFilter = (options: { includeSource?: string | string[]; excludeSource?: string | string[] }) => {
  const includes = options.includeSource ?? ['src/**']
  const excludes = options.excludeSource ?? ['node_modules/**']
  _includePatterns = (Array.isArray(includes) ? includes : [includes]).map(globToRegex)
  _excludePatterns = (Array.isArray(excludes) ? excludes : [excludes]).map(globToRegex)
}

export const getSourceFilter = () => ({ include: _includePatterns, exclude: _excludePatterns })

/** Check if a file path matches the source filter */
export const isSourceMatch = (filePath: string): boolean => {
  if (!filePath) return false
  // Try matching from common project roots to handle absolute paths
  // e.g. /home/user/project/src/App.tsx -> try matching src/App.tsx
  const candidates = [filePath]
  const srcIdx = filePath.lastIndexOf('/src/')
  if (srcIdx !== -1) candidates.push(filePath.slice(srcIdx + 1))
  const pkgIdx = filePath.lastIndexOf('/packages/')
  if (pkgIdx !== -1) candidates.push(filePath.slice(pkgIdx + 1))

  const matchesAny = (patterns: RegExp[]) =>
    candidates.some(c => patterns.some(p => p.test(c)))

  if (matchesAny(_excludePatterns)) return false
  if (_includePatterns.length === 0) return true
  return matchesAny(_includePatterns)
}

export const generateSelector = (element: Element): string => {
  const parts: string[] = []
  let current: Element | null = element

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector = `#${current.id}`
      parts.unshift(selector)
      break
    }

    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(el => el.tagName === current!.tagName)
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${index})`
      }
    }

    parts.unshift(selector)
    current = current.parentElement
  }

  return parts.join(' > ')
}
