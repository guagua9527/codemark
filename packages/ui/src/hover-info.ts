import type { ComponentMeta } from './types.js'

export class CodemarkHoverInfo extends HTMLElement {
  private root: ShadowRoot
  private infoEl: HTMLDivElement
  private visible = false

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open' })
    this.infoEl = document.createElement('div')
    this.infoEl.id = 'hover-info'
    this.root.appendChild(this.infoEl)
    this.injectStyles()
  }

  connectedCallback() {
    this.style.cssText = 'position:fixed;pointer-events:none;z-index:1000000;'
  }

  private injectStyles() {
    const style = document.createElement('style')
    style.textContent = `
      :host { all: initial; display: none; }
      :host([visible]) { display: block; }
      #hover-info {
        background: rgba(0,0,0,0.85);
        color: #fff;
        padding: 6px 10px;
        border-radius: 4px;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      #hover-info .component-name { font-weight: 600; color: #4A90D9; }
      #hover-info .source-file { color: #aaa; font-size: 11px; margin-top: 2px; }
    `
    this.root.appendChild(style)
  }

  show(x: number, y: number, meta: ComponentMeta) {
    this.infoEl.innerHTML = `
      <div class="component-name">${meta.componentName}</div>
      ${meta.filePath ? `<div class="source-file">${meta.filePath}:${meta.line}</div>` : ''}
    `
    this.style.left = `${x + 12}px`
    this.style.top = `${y + 12}px`
    this.setAttribute('visible', '')
    this.visible = true
  }

  hide() {
    this.removeAttribute('visible')
    this.visible = false
  }

  isVisible(): boolean {
    return this.visible
  }
}

if (!customElements.get('codemark-hover-info')) {
  customElements.define('codemark-hover-info', CodemarkHoverInfo)
}
