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

let _sourceRoots: string[] = ['src/']

export const setSourceRoot = (root: string | string[]) => {
  const roots = Array.isArray(root) ? root : [root]
  _sourceRoots = roots.map(r => r.endsWith('/') ? r : r + '/')
}

export const getSourceRoot = () => _sourceRoots

/** Check if a file path is within the configured source root */
export const isInSourceRoot = (filePath: string): boolean => {
  if (!filePath) return false
  const normalized = filePath.replace(/^\//, '')
  return _sourceRoots.some(r => normalized.startsWith(r) || normalized.startsWith('./' + r))
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
