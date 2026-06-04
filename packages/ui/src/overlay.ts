export class CodemarkOverlay extends HTMLElement {
  private root: ShadowRoot
  private container: HTMLDivElement

  constructor() {
    super()
    this.root = this.attachShadow({ mode: 'open' })
    this.container = document.createElement('div')
    this.container.id = 'codemark-container'
    this.root.appendChild(this.container)
    this.injectStyles()
  }

  connectedCallback() {
    this.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999999;'
  }

  private injectStyles = () => {
    const style = document.createElement('style')
    style.textContent = `
      :host { all: initial; }
      #codemark-container { position: relative; width: 100%; height: 100%; }
      .codemark-highlight {
        position: absolute;
        outline: 2px dashed #4A90D9;
        outline-offset: 2px;
        background: rgba(74, 144, 217, 0.1);
        pointer-events: none;
        transition: all 0.1s ease;
        border-radius: 2px;
      }
    `
    this.root.appendChild(style)
  }

  getContainer = (): HTMLDivElement => {
    return this.container
  }

  clear = () => {
    this.container.innerHTML = ''
  }
}

if (!customElements.get('codemark-overlay')) {
  customElements.define('codemark-overlay', CodemarkOverlay)
}
