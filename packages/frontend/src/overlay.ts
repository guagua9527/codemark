export class Overlay {
  private root: ShadowRoot
  private container: HTMLDivElement

  constructor() {
    const host = document.createElement('div')
    host.id = '__codemark_overlay__'
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999999;'
    document.body.appendChild(host)

    this.root = host.attachShadow({ mode: 'open' })
    this.container = document.createElement('div')
    this.root.appendChild(this.container)

    this.injectStyles()
  }

  private injectStyles() {
    const style = document.createElement('style')
    style.textContent = `
      :host { all: initial; }
      .codemark-highlight {
        position: absolute;
        outline: 2px dashed #4A90D9;
        outline-offset: 2px;
        background: rgba(74, 144, 217, 0.1);
        pointer-events: none;
        transition: all 0.1s ease;
        border-radius: 2px;
      }
      .codemark-marker {
        position: absolute;
        width: 20px;
        height: 20px;
        background: #4A90D9;
        border-radius: 50%;
        cursor: pointer;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-family: system-ui, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transform: translate(50%, -50%);
      }
      .codemark-marker:hover { background: #357ABD; transform: translate(50%, -50%) scale(1.1); }
      .codemark-input-box {
        position: absolute;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 12px;
        pointer-events: auto;
        width: 280px;
        z-index: 1000000;
        font-family: system-ui, sans-serif;
      }
      .codemark-input-box textarea {
        width: 100%;
        min-height: 60px;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px;
        font-size: 13px;
        resize: vertical;
        box-sizing: border-box;
      }
      .codemark-input-box button {
        margin-top: 8px;
        padding: 6px 16px;
        background: #4A90D9;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }
      .codemark-input-box button:hover { background: #357ABD; }
      .codemark-detail {
        position: absolute;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 12px;
        pointer-events: auto;
        width: 300px;
        z-index: 1000000;
        font-family: system-ui, sans-serif;
        font-size: 13px;
      }
      .codemark-detail .content { margin-bottom: 8px; color: #333; }
      .codemark-detail .meta { color: #888; font-size: 11px; margin-bottom: 8px; }
      .codemark-detail button {
        padding: 4px 12px;
        background: #4A90D9;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-right: 4px;
      }
      .codemark-detail button.danger { background: #E74C3C; }
      .codemark-detail button.danger:hover { background: #C0392B; }
    `
    this.root.appendChild(style)
  }

  getContainer(): HTMLDivElement {
    return this.container
  }

  clear() {
    this.container.innerHTML = ''
  }
}
