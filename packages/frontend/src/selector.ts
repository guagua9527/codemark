export class ElementSelector {
  private highlightEl: HTMLDivElement | null = null
  private active = false
  private onSelectCallback: ((element: Element, selector: string, meta: ComponentMeta) => void) | null = null

  constructor(private overlayContainer: HTMLDivElement) {}

  activate() {
    this.active = true
    document.addEventListener('mouseover', this.handleMouseOver, true)
    document.addEventListener('click', this.handleClick, true)
    document.addEventListener('keydown', this.handleEscape, true)
  }

  deactivate() {
    this.active = false
    document.removeEventListener('mouseover', this.handleMouseOver, true)
    document.removeEventListener('click', this.handleClick, true)
    document.removeEventListener('keydown', this.handleEscape, true)
    this.removeHighlight()
  }

  onSelect(cb: (element: Element, selector: string, meta: ComponentMeta) => void) {
    this.onSelectCallback = cb
  }

  private handleMouseOver = (e: MouseEvent) => {
    if (!this.active) return
    const target = e.target as Element
    if (target.closest('#__codemark_overlay__')) return
    this.showHighlight(target)
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.active) return
    const target = e.target as Element
    if (target.closest('#__codemark_overlay__')) return
    e.preventDefault()
    e.stopPropagation()

    const selector = generateSelector(target)
    const meta = getComponentMeta(target)
    this.onSelectCallback?.(target, selector, meta)
    this.deactivate()
  }

  private handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.deactivate()
  }

  private showHighlight(element: Element) {
    if (!this.highlightEl) {
      this.highlightEl = document.createElement('div')
      this.highlightEl.className = 'codemark-highlight'
      this.overlayContainer.appendChild(this.highlightEl)
    }
    const rect = element.getBoundingClientRect()
    this.highlightEl.style.top = `${rect.top}px`
    this.highlightEl.style.left = `${rect.left}px`
    this.highlightEl.style.width = `${rect.width}px`
    this.highlightEl.style.height = `${rect.height}px`
  }

  private removeHighlight() {
    this.highlightEl?.remove()
    this.highlightEl = null
  }
}

export interface ComponentMeta {
  filePath: string
  line: number
  column: number
  componentName: string
}

export function generateSelector(element: Element): string {
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

export function getComponentMeta(element: Element): ComponentMeta {
  // Vue 3 __file metadata — walk up the DOM to find the nearest Vue component
  let el: Element | null = element
  while (el) {
    const vueComp = (el as any).__vueParentComponent
    if (vueComp?.type?.__file) {
      return {
        filePath: vueComp.type.__file,
        line: 0,
        column: 0,
        componentName: vueComp.type.name || vueComp.type.__name || 'Unknown'
      }
    }
    el = el.parentElement
  }

  // React __source metadata
  const reactInternal = Object.keys(element).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'))
  if (reactInternal) {
    const fiber = (element as any)[reactInternal]
    if (fiber?._debugSource) {
      return {
        filePath: fiber._debugSource.fileName,
        line: fiber._debugSource.lineNumber,
        column: fiber._debugSource.columnNumber,
        componentName: fiber.type?.name || fiber.type?.displayName || 'Unknown'
      }
    }
  }

  // Fallback: try data attributes
  const file = element.getAttribute('data-codemark-file')
  if (file) {
    return {
      filePath: file,
      line: parseInt(element.getAttribute('data-codemark-line') || '0'),
      column: 0,
      componentName: element.getAttribute('data-codemark-component') || 'Unknown'
    }
  }

  return { filePath: '', line: 0, column: 0, componentName: 'Unknown' }
}
