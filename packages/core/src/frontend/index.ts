export interface ComponentMeta {
  filePath: string
  line: number
  column: number
  componentName: string
  rootElement: Element | null
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
