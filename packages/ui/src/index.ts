import { CodemarkOverlay } from './overlay.js'
import { CodemarkHoverInfo } from './hover-info.js'
import { ElementSelector } from './selector.js'
import { WSClient } from './ws-client.js'
import { getRegisteredProviders, setSourceFilter, type ComponentMeta, type ComponentMetaProvider } from '@codemark/core/frontend'
import { DEFAULT_SERVER_PORT, DATA_CODEMARK_FILE, DATA_CODEMARK_LINE, DATA_CODEMARK_COMPONENT, type CodeMarkBaseOptions } from '@codemark/core/common'
import type { Annotation, AnnotationInputData } from './types.js'

export { registerMetaProvider, generateSelector } from '@codemark/core/frontend'
export type { Annotation, ComponentMeta, AnnotationInputData, ComponentMetaProvider } from './types.js'
export { CodemarkOverlay } from './overlay.js'
export { CodemarkHoverInfo } from './hover-info.js'
export { ElementSelector } from './selector.js'
export { WSClient } from './ws-client.js'

let overlay: CodemarkOverlay | null = null
let hoverInfo: CodemarkHoverInfo | null = null
let selector: ElementSelector | null = null
let wsClient: WSClient | null = null
let isActive = false
let serverPort = DEFAULT_SERVER_PORT

export interface CodeMarkOptions extends CodeMarkBaseOptions {
  metaProvider?: ComponentMetaProvider
}

const isCustomElement = (el: Element): boolean =>
  el.tagName.includes('-') && !!customElements.get(el.tagName.toLowerCase())

const defaultMetaProvider: ComponentMetaProvider = {
  getComponentMeta: (element: Element): ComponentMeta | null => {
    const file = element.getAttribute(DATA_CODEMARK_FILE)
    if (file) {
      return {
        filePath: file,
        line: parseInt(element.getAttribute(DATA_CODEMARK_LINE) || '0'),
        column: 0,
        componentName: element.getAttribute(DATA_CODEMARK_COMPONENT) || 'Unknown',
        componentRootElement: null,
        targetElement: element,
        instanceType: 'html',
      }
    }
    // Walk up to find enclosing custom element (including across shadow DOM boundaries)
    let el: Element | null = element
    while (el) {
      if (isCustomElement(el)) {
        return {
          filePath: '',
          line: 0,
          column: 0,
          componentName: el.tagName.toLowerCase(),
          componentRootElement: el,
          targetElement: element,
          componentInstance: el,
          instanceType: 'webcomponent',
        }
      }
      // Cross shadow DOM boundary
      const root = el.getRootNode()
      if (root instanceof ShadowRoot) {
        el = root.host
      } else {
        el = el.parentElement
      }
    }
    return { filePath: '', line: 0, column: 0, componentName: 'Unknown', componentRootElement: null, targetElement: element, instanceType: 'html' }
  },
}

const resolveProvider = (): ComponentMetaProvider => {
  const providers = getRegisteredProviders()
  if (providers.length === 0) return defaultMetaProvider
  if (providers.length === 1) return providers[0].provider
  console.warn(
    `[CodeMark] Multiple meta providers detected: ${providers.map(p => p.name).join(', ')}. Falling back to default HTML provider. Please install only one.`,
  )
  return defaultMetaProvider
}

export const initCodeMark = (options: CodeMarkOptions = {}) => {
  serverPort = options.serverPort || DEFAULT_SERVER_PORT
  setSourceFilter({ includeSource: options.includeSource, excludeSource: options.excludeSource })
  const provider = options.metaProvider || resolveProvider()

  // Create Web Components
  overlay = document.createElement('codemark-overlay') as CodemarkOverlay
  document.body.appendChild(overlay)

  hoverInfo = document.createElement('codemark-hover-info') as CodemarkHoverInfo
  document.body.appendChild(hoverInfo)

  selector = new ElementSelector(overlay.getContainer(), hoverInfo, provider)
  wsClient = new WSClient(serverPort)
  wsClient.connect()

  // Handle annotation events from server
  wsClient.on('annotation:create', (payload) => {
    const annotation = (payload as { annotation: Annotation }).annotation
    addMarker(annotation)
  })

  wsClient.on('annotation:delete', (payload) => {
    const { id } = payload as { id: string }
    removeMarker(id)
  })

  wsClient.on('task:result', (payload) => {
    const result = payload as { taskId: string; status: string; summary?: string; error?: string }
    const msg = result.status === 'failed'
      ? `[CodeMark] 修复失败: ${result.error || '未知错误'}`
      : `[CodeMark] 修复成功: ${result.summary}`
    console.log(msg)
    // Show toast notification
    const toast = document.createElement('div')
    toast.style.cssText = `
      position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;
      color:white;font-size:13px;z-index:9999999;font-family:system-ui,sans-serif;
      box-shadow:0 4px 12px rgba(0,0,0,0.2);max-width:400px;
      background:${result.status === 'failed' ? '#E74C3C' : '#2ECC71'};
    `
    toast.textContent = msg
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 5000)
  })

  // Handle user selecting an element
  selector.onSelect((element, selectorStr, meta) => {
    const rect = element.getBoundingClientRect()
    showInput(rect, selectorStr, {
      sourceFile: meta.filePath,
      sourceLine: meta.line,
      componentName: meta.componentName,
    })
  })

  createToggleButton()
  loadAnnotations()

  console.log('[CodeMark] Initialized. Press toggle button or Ctrl+Shift+A to activate.')
}

// --- Marker management ---

const selectorAnnotations = new Map<string, Annotation[]>()
const selectorMarkers = new Map<string, HTMLDivElement>()

const addMarker = (annotation: Annotation) => {
  const target = document.querySelector(annotation.selector)
  if (!target) return

  const existing = selectorAnnotations.get(annotation.selector)
  if (existing) {
    existing.push(annotation)
    refreshMarker(annotation.selector)
    return
  }

  selectorAnnotations.set(annotation.selector, [annotation])

  const marker = document.createElement('div')
  marker.id = `__codemark_marker__`
  marker.style.cssText = `
    position: absolute; min-width: 20px; height: 20px; background: #4A90D9;
    border-radius: 10px; cursor: pointer; display: flex; align-items: center;
    justify-content: center; color: white; font-size: 11px; z-index: 999999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2); padding: 0 5px;
  `
  marker.addEventListener('click', (e) => {
    e.stopPropagation()
    showPanel(annotation.selector, marker)
  })

  document.body.appendChild(marker)
  selectorMarkers.set(annotation.selector, marker)
  refreshMarker(annotation.selector)
}

const removeMarker = (annotationId: string) => {
  for (const [selector, annotations] of selectorAnnotations) {
    const idx = annotations.findIndex(a => a.id === annotationId)
    if (idx === -1) continue
    annotations.splice(idx, 1)
    if (annotations.length === 0) {
      selectorMarkers.get(selector)?.remove()
      selectorMarkers.delete(selector)
      selectorAnnotations.delete(selector)
    } else {
      refreshMarker(selector)
    }
    return
  }
}

const refreshMarker = (selector: string) => {
  const annotations = selectorAnnotations.get(selector)
  const marker = selectorMarkers.get(selector)
  if (!annotations || !marker) return
  marker.textContent = annotations.length > 1 ? `💬${annotations.length}` : '💬'
  marker.title = annotations.map(a => a.content).join('\n')
  updateMarkerPosition(selector)
}

const updateMarkerPosition = (selector: string) => {
  const marker = selectorMarkers.get(selector)
  if (!marker) return
  const target = document.querySelector(selector)
  if (!target) { marker.style.display = 'none'; return }
  const rect = target.getBoundingClientRect()
  marker.style.top = `${rect.top + window.scrollY}px`
  marker.style.left = `${rect.right + window.scrollX}px`
}

const showInput = (rect: DOMRect, selectorStr: string, meta: { sourceFile: string; sourceLine: number; componentName: string }) => {
  const existing = document.getElementById('__codemark_input__')
  if (existing) existing.remove()

  const box = document.createElement('div')
  box.id = '__codemark_input__'
  box.style.cssText = `
    position: absolute; top: ${rect.bottom + 8}px; left: ${rect.left}px;
    background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 12px; width: 280px; z-index: 1000000; font-family: system-ui, sans-serif;
  `
  box.innerHTML = `
    <div style="font-size:11px;color:#888;margin-bottom:6px;">
      ${meta.componentName}${meta.sourceFile ? ` · ${meta.sourceFile}:${meta.sourceLine}` : ''}
    </div>
    <textarea placeholder="描述这个问题..." style="width:100%;min-height:60px;border:1px solid #ddd;border-radius:4px;padding:8px;font-size:13px;resize:vertical;box-sizing:border-box;"></textarea>
    <div style="display:flex;justify-content:flex-end;">
      <button class="cm-cancel" style="margin-top:8px;padding:6px 16px;background:#ccc;color:#333;border:none;border-radius:4px;cursor:pointer;font-size:13px;margin-right:4px;">取消</button>
      <button class="cm-submit" style="margin-top:8px;padding:6px 16px;background:#4A90D9;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;">提交</button>
    </div>
  `

  const textarea = box.querySelector('textarea')!
  box.querySelector('.cm-cancel')!.addEventListener('click', (e) => {
    console.log('[CodeMark] cancel clicked', e)
    box.remove()
  })
  box.querySelector('.cm-submit')!.addEventListener('click', (e) => {
    console.log('[CodeMark] submit clicked', e)
    const content = textarea.value.trim()
    if (!content) return
    wsClient?.send('annotation:create', {
      annotation: { selector: selectorStr, content, intent: 'auto', ...meta },
    })
    box.remove()
  })

  document.body.appendChild(box)
  textarea.focus()
}

const showPanel = (selector: string, marker: HTMLDivElement) => {
  const existing = document.getElementById('__codemark_panel__')
  if (existing) existing.remove()

  const annotations = selectorAnnotations.get(selector) || []
  const rect = marker.getBoundingClientRect()
  const panel = document.createElement('div')
  panel.id = '__codemark_panel__'
  panel.style.cssText = `
    position: absolute; top: ${rect.top}px; left: ${rect.right + 8}px;
    background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 12px; width: 300px; z-index: 1000000; font-family: system-ui, sans-serif; font-size: 13px;
    max-height: 400px; overflow-y: auto;
  `

  const itemsHtml = annotations.map(a => `
    <div class="cm-annotation-item" data-id="${a.id}" style="padding:8px 0;border-bottom:1px solid #eee;">
      <div style="color:#333;margin-bottom:4px;">${a.content}</div>
      <div style="color:#888;font-size:11px;margin-bottom:6px;">${a.componentName} · ${a.sourceFile}:${a.sourceLine}</div>
      <div>
        <button class="cm-fix" style="padding:3px 10px;background:#4A90D9;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;margin-right:4px;">AI 修改</button>
        <button class="cm-delete" style="padding:3px 10px;background:#E74C3C;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">删除</button>
      </div>
    </div>
  `).join('')

  panel.innerHTML = itemsHtml

  panel.querySelectorAll('.cm-annotation-item').forEach(item => {
    const id = (item as HTMLElement).dataset.id!
    item.querySelector('.cm-fix')!.addEventListener('click', () => {
      const host = window.location.hostname || 'localhost'
      fetch(`http://${host}:${serverPort}/api/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotationId: id }),
      }).catch(console.error)
      panel.remove()
    })
    item.querySelector('.cm-delete')!.addEventListener('click', () => {
      wsClient?.send('annotation:delete', { id })
      removeMarker(id)
      panel.remove()
    })
  })

  document.body.appendChild(panel)
}

const createToggleButton = () => {
  const btn = document.createElement('div')
  btn.id = '__codemark_toggle__'
  btn.textContent = '✏️'
  btn.title = 'CodeMark: 点击开启批注模式'
  btn.style.cssText = `
    position:fixed;bottom:20px;right:20px;width:44px;height:44px;
    background:#4A90D9;border-radius:50%;display:flex;align-items:center;
    justify-content:center;cursor:pointer;z-index:999998;font-size:20px;
    box-shadow:0 2px 12px rgba(0,0,0,0.2);transition:background 0.2s;user-select:none;
  `
  btn.addEventListener('click', () => toggleSelector())
  document.body.appendChild(btn)

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault()
      toggleSelector()
    }
  })
}

const toggleSelector = () => {
  if (!selector) return
  if (isActive) {
    selector.deactivate()
    isActive = false
    const btn = document.getElementById('__codemark_toggle__')
    if (btn) { btn.style.background = '#4A90D9'; btn.textContent = '✏️' }
  } else {
    selector.activate()
    isActive = true
    const btn = document.getElementById('__codemark_toggle__')
    if (btn) { btn.style.background = '#E74C3C'; btn.textContent = '❌' }
  }
}

const loadAnnotations = async () => {
  try {
    const host = window.location.hostname || 'localhost'
    const res = await fetch(`http://${host}:${serverPort}/api/annotations`)
    const data = await res.json() as { annotations: Annotation[] }
    data.annotations.forEach(a => addMarker(a))
  } catch {
    // Server might not be ready yet
  }
}

window.addEventListener('scroll', () => { for (const sel of selectorMarkers.keys()) updateMarkerPosition(sel) }, { passive: true })
window.addEventListener('resize', () => { for (const sel of selectorMarkers.keys()) updateMarkerPosition(sel) }, { passive: true })
