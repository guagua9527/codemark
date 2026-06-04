import { CodemarkOverlay } from './overlay.js'
import { CodemarkHoverInfo } from './hover-info.js'
import { ElementSelector } from './selector.js'
import { WSClient } from './ws-client.js'
import type { Annotation, ComponentMeta, AnnotationInputData } from './types.js'

export type { Annotation, ComponentMeta, AnnotationInputData } from './types.js'
export { CodemarkOverlay } from './overlay.js'
export { CodemarkHoverInfo } from './hover-info.js'
export { ElementSelector, generateSelector, getComponentMeta } from './selector.js'
export { WSClient } from './ws-client.js'

let overlay: CodemarkOverlay | null = null
let hoverInfo: CodemarkHoverInfo | null = null
let selector: ElementSelector | null = null
let wsClient: WSClient | null = null
let isActive = false

export interface CodeMarkOptions {
  serverPort?: number
}

export function initCodeMark(options: CodeMarkOptions = {}) {
  const port = options.serverPort || 3001

  // Create Web Components
  overlay = document.createElement('codemark-overlay') as CodemarkOverlay
  document.body.appendChild(overlay)

  hoverInfo = document.createElement('codemark-hover-info') as CodemarkHoverInfo
  document.body.appendChild(hoverInfo)

  selector = new ElementSelector(overlay.getContainer(), hoverInfo)
  wsClient = new WSClient(port)
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
    const result = payload as { taskId: string; status: string; summary?: string }
    console.log(`[CodeMark] Task ${result.taskId}: ${result.status} - ${result.summary}`)
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
  loadAnnotations(port)

  console.log('[CodeMark] Initialized. Press toggle button or Ctrl+Shift+A to activate.')
}

// --- Marker management ---

const markers = new Map<string, HTMLDivElement>()
const annotationStore = new Map<string, Annotation>()

function addMarker(annotation: Annotation) {
  const target = document.querySelector(annotation.selector)
  if (!target) return

  const marker = document.createElement('div')
  marker.textContent = '💬'
  marker.title = annotation.content
  marker.style.cssText = `
    position: absolute; width: 20px; height: 20px; background: #4A90D9;
    border-radius: 50%; cursor: pointer; display: flex; align-items: center;
    justify-content: center; color: white; font-size: 11px; z-index: 999999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `
  marker.addEventListener('click', (e) => {
    e.stopPropagation()
    showPanel(annotation, marker)
  })

  document.body.appendChild(marker)
  markers.set(annotation.id, marker)
  annotationStore.set(annotation.id, annotation)
  updateMarkerPosition(annotation.id)
}

function removeMarker(id: string) {
  const marker = markers.get(id)
  if (marker) {
    marker.remove()
    markers.delete(id)
    annotationStore.delete(id)
  }
}

function updateMarkerPosition(id: string) {
  const marker = markers.get(id)
  if (!marker) return
  const annotation = annotationStore.get(id)
  if (!annotation) return
  const target = document.querySelector(annotation.selector)
  if (!target) { marker.style.display = 'none'; return }
  const rect = target.getBoundingClientRect()
  marker.style.top = `${rect.top + window.scrollY}px`
  marker.style.left = `${rect.right + window.scrollX}px`
}

function showInput(rect: DOMRect, selectorStr: string, meta: { sourceFile: string; sourceLine: number; componentName: string }) {
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
  box.querySelector('.cm-cancel')!.addEventListener('click', () => box.remove())
  box.querySelector('.cm-submit')!.addEventListener('click', () => {
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

function showPanel(annotation: Annotation, marker: HTMLDivElement) {
  const existing = document.getElementById('__codemark_panel__')
  if (existing) existing.remove()

  const rect = marker.getBoundingClientRect()
  const panel = document.createElement('div')
  panel.id = '__codemark_panel__'
  panel.style.cssText = `
    position: absolute; top: ${rect.top}px; left: ${rect.right + 8}px;
    background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 12px; width: 300px; z-index: 1000000; font-family: system-ui, sans-serif; font-size: 13px;
  `
  panel.innerHTML = `
    <div style="margin-bottom:8px;color:#333;">${annotation.content}</div>
    <div style="color:#888;font-size:11px;margin-bottom:8px;">${annotation.componentName} · ${annotation.sourceFile}:${annotation.sourceLine}</div>
    <div>
      <button class="cm-fix" style="padding:4px 12px;background:#4A90D9;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;margin-right:4px;">AI 修改</button>
      <button class="cm-delete" style="padding:4px 12px;background:#E74C3C;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">删除</button>
    </div>
  `

  panel.querySelector('.cm-fix')!.addEventListener('click', () => {
    const host = window.location.hostname || 'localhost'
    fetch(`http://${host}:3001/api/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotationId: annotation.id }),
    }).catch(console.error)
    panel.remove()
  })

  panel.querySelector('.cm-delete')!.addEventListener('click', () => {
    wsClient?.send('annotation:delete', { id: annotation.id })
    removeMarker(annotation.id)
    panel.remove()
  })

  document.body.appendChild(panel)
}

function createToggleButton() {
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

function toggleSelector() {
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

async function loadAnnotations(port: number) {
  try {
    const host = window.location.hostname || 'localhost'
    const res = await fetch(`http://${host}:${port}/api/annotations`)
    const data = await res.json() as { annotations: Annotation[] }
    data.annotations.forEach(a => addMarker(a))
  } catch {
    // Server might not be ready yet
  }
}

window.addEventListener('scroll', () => { for (const id of markers.keys()) updateMarkerPosition(id) }, { passive: true })
window.addEventListener('resize', () => { for (const id of markers.keys()) updateMarkerPosition(id) }, { passive: true })
