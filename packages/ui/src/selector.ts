import type { ComponentMeta } from './types.js'

export class ElementSelector {
  private highlightEl: HTMLDivElement | null = null
  private active = false
  private onSelectCallback: ((element: Element, selector: string, meta: ComponentMeta) => void) | null = null
  private overlayContainer: HTMLDivElement
  private hoverInfo: HTMLElement

  constructor(overlayContainer: HTMLDivElement, hoverInfo: HTMLElement) {
    this.overlayContainer = overlayContainer
    this.hoverInfo = hoverInfo
  }

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
    ;(this.hoverInfo as any).hide?.()
  }

  onSelect(cb: (element: Element, selector: string, meta: ComponentMeta) => void) {
    this.onSelectCallback = cb
  }

  private handleMouseOver = (e: MouseEvent) => {
    if (!this.active) return
    const target = e.target as Element
    if (target.closest('codemark-overlay')) return
    this.showHighlight(target)
    const meta = getComponentMeta(target)
    ;(this.hoverInfo as any).show?.(e.clientX, e.clientY, meta)
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.active) return
    const target = e.target as Element
    if (target.closest('codemark-overlay')) return
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
  // Vue 3
  let el: Element | null = element
  while (el) {
    const vueComp = (el as any).__vueParentComponent
    if (vueComp?.type?.__file) {
      return {
        filePath: vueComp.type.__file,
        line: 0,
        column: 0,
        componentName: vueComp.type.name || vueComp.type.__name || 'Unknown',
      }
    }
    el = el.parentElement
  }

  // React
  const reactInternal = Object.keys(element).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'))
  if (reactInternal) {
    const fiber = (element as any)[reactInternal]
    if (fiber?._debugSource) {
      return {
        filePath: fiber._debugSource.fileName,
        line: fiber._debugSource.lineNumber,
        column: fiber._debugSource.columnNumber,
        componentName: fiber.type?.name || fiber.type?.displayName || 'Unknown',
      }
    }
  }

  // data-attributes fallback
  const file = element.getAttribute('data-codemark-file')
  if (file) {
    return {
      filePath: file,
      line: parseInt(element.getAttribute('data-codemark-line') || '0'),
      column: 0,
      componentName: element.getAttribute('data-codemark-component') || 'Unknown',
    }
  }

  return { filePath: '', line: 0, column: 0, componentName: 'Unknown' }
}
