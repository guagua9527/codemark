import { generateSelector, type ComponentMeta, type ComponentMetaProvider } from '@codemark/core/frontend'

const isCodeMarkElement = (el: Element): boolean =>
  el.tagName.startsWith('CODEMARK-') || el.id.startsWith('__codemark_')

export class ElementSelector {
  private highlightEl: HTMLDivElement | null = null
  private active = false
  private onSelectCallback: ((element: Element, selector: string, meta: ComponentMeta) => void) | null = null
  private overlayContainer: HTMLDivElement
  private hoverInfo: HTMLElement
  private metaProvider: ComponentMetaProvider
  private lastRootElement: Element | null = null
  private depth = 1
  private lastX = 0
  private lastY = 0

  private onMouseOver = (e: MouseEvent) => {
    if (!this.active) return
    const target = e.target as Element
    if (isCodeMarkElement(target)) return
    this.lastX = e.clientX
    this.lastY = e.clientY
    const meta = this.metaProvider.getComponentMeta(target, this.depth)
    if (!meta || meta.componentName === 'Unknown') {
      this.removeHighlight()
      ;(this.hoverInfo as any).show?.(e.clientX, e.clientY, { componentName: '(No component)', filePath: '', line: 0, column: 0, componentRootElement: null, targetElement: null, instanceType: 'html' })
      this.lastRootElement = null
      return
    }
    const highlightTarget = meta.componentRootElement || target
    this.showHighlight(highlightTarget)
    ;(this.hoverInfo as any).show?.(e.clientX, e.clientY, meta)
    this.lastRootElement = highlightTarget
  }

  private handleMouseOver = this.onMouseOver

  private onWheel = (e: WheelEvent) => {
    if (!this.active) return
    const target = document.elementFromPoint(this.lastX, this.lastY)
    if (!target || isCodeMarkElement(target)) return
    e.preventDefault()
    const newDepth = e.deltaY < 0 ? this.depth + 1 : this.depth - 1
    if (newDepth < 1) return
    const meta = this.metaProvider.getComponentMeta(target, newDepth)
    if (!meta || meta.componentName === 'Unknown') return
    this.depth = newDepth
    const highlightTarget = meta.componentRootElement || target
    this.showHighlight(highlightTarget)
    ;(this.hoverInfo as any).show?.(this.lastX, this.lastY, meta)
    this.lastRootElement = highlightTarget
  }

  private handleWheel = this.onWheel

  constructor(overlayContainer: HTMLDivElement, hoverInfo: HTMLElement, metaProvider: ComponentMetaProvider) {
    this.overlayContainer = overlayContainer
    this.hoverInfo = hoverInfo
    this.metaProvider = metaProvider
  }

  activate = () => {
    this.active = true
    this.depth = 1
    document.addEventListener('mousemove', this.handleMouseOver, true)
    document.addEventListener('click', this.handleClick, true)
    document.addEventListener('keydown', this.handleEscape, true)
    document.addEventListener('wheel', this.handleWheel, { passive: false, capture: true })
  }

  deactivate = () => {
    this.active = false
    document.removeEventListener('mousemove', this.handleMouseOver, true)
    document.removeEventListener('click', this.handleClick, true)
    document.removeEventListener('keydown', this.handleEscape, true)
    document.removeEventListener('wheel', this.handleWheel, { capture: true } as any)
    this.removeHighlight()
    ;(this.hoverInfo as any).hide?.()
  }

  onSelect = (cb: (element: Element, selector: string, meta: ComponentMeta) => void) => {
    this.onSelectCallback = cb
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.active) return
    const target = e.target as Element
    if (target.closest('codemark-overlay')) return
    if (isCodeMarkElement(target)) return
    e.preventDefault()
    e.stopPropagation()
    const meta = this.metaProvider.getComponentMeta(target)
    if (!meta) return
    console.log('[CodeMark] meta:', meta)
    const selectTarget = meta.componentRootElement || target
    const selector = generateSelector(selectTarget)
    this.onSelectCallback?.(selectTarget, selector, meta)
  }

  private handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.deactivate()
  }

  private showHighlight = (element: Element) => {
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

  private removeHighlight = () => {
    this.highlightEl?.remove()
    this.highlightEl = null
  }
}
