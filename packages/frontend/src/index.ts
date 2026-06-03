import { Overlay } from './overlay.js'
import { ElementSelector } from './selector.js'
import { AnnotationUI } from './annotation.js'
import { WSClient } from './ws-client.js'
import { Annotation } from './types.js'

export type { Annotation, FixResult, WSMessage } from './types.js'

let overlay: Overlay | null = null
let selector: ElementSelector | null = null
let annotationUI: AnnotationUI | null = null
let wsClient: WSClient | null = null
let isActive = false

export interface CodeMarkOptions {
  serverPort?: number
}

export function initCodeMark(options: CodeMarkOptions = {}) {
  const port = options.serverPort || 3001

  overlay = new Overlay()
  selector = new ElementSelector(overlay.getContainer())
  annotationUI = new AnnotationUI(overlay.getContainer())
  wsClient = new WSClient(port)

  // Connect WebSocket
  wsClient.connect()

  // Handle annotation events from server
  wsClient.on('annotation:create', (payload) => {
    const annotation = (payload as { annotation: Annotation }).annotation
    annotationUI!.addMarker(annotation)
  })

  wsClient.on('annotation:delete', (payload) => {
    const { id } = payload as { id: string }
    annotationUI!.removeMarker(id)
  })

  wsClient.on('fix:result', (payload) => {
    const result = payload as { annotationId: string; status: string; summary?: string }
    if (result.status === 'applied') {
      console.log(`[CodeMark] Fix applied: ${result.summary}`)
    } else {
      console.error(`[CodeMark] Fix failed for annotation ${result.annotationId}`)
    }
  })

  // Handle user selecting an element
  selector.onSelect((element, selectorStr, meta) => {
    const rect = element.getBoundingClientRect()
    annotationUI!.showInput(rect, selectorStr, {
      sourceFile: meta.filePath,
      sourceLine: meta.line,
      componentName: meta.componentName,
    })
  })

  // Handle annotation submission
  annotationUI.onSubmit((annotationData) => {
    wsClient!.send('annotation:create', { annotation: annotationData })
  })

  // Handle AI fix trigger
  annotationUI.onFix((annotationId) => {
    // Trigger fix via REST API (not WebSocket) to get proper async handling
    fetch(`http://localhost:${port}/api/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotationId }),
    }).catch(err => console.error('[CodeMark] Fix request failed', err))
  })

  // Handle annotation deletion
  annotationUI.onDelete((annotationId) => {
    wsClient!.send('annotation:delete', { id: annotationId })
  })

  // Update marker positions on scroll/resize
  window.addEventListener('scroll', () => annotationUI!.updateAllPositions(), { passive: true })
  window.addEventListener('resize', () => annotationUI!.updateAllPositions(), { passive: true })

  // Create toggle button
  createToggleButton()

  // Load existing annotations
  loadAnnotations(port)

  console.log('[CodeMark] Initialized. Press the toggle button or Ctrl+Shift+A to activate.')
}

function createToggleButton() {
  const btn = document.createElement('div')
  btn.id = '__codemark_toggle__'
  btn.textContent = '✏️'
  btn.title = 'CodeMark: 点击开启批注模式'
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 44px;
    height: 44px;
    background: #4A90D9;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 999998;
    font-size: 20px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
    transition: background 0.2s;
    user-select: none;
  `

  btn.addEventListener('click', () => toggleSelector())
  document.body.appendChild(btn)

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault()
      toggleSelector()
    }
  })
}

function toggleSelector() {
  if (!selector || !overlay) return

  if (isActive) {
    selector.deactivate()
    isActive = false
    updateToggleButton(false)
  } else {
    selector.activate()
    isActive = true
    updateToggleButton(true)
  }
}

function updateToggleButton(active: boolean) {
  const btn = document.getElementById('__codemark_toggle__')
  if (!btn) return
  btn.style.background = active ? '#E74C3C' : '#4A90D9'
  btn.textContent = active ? '❌' : '✏️'
  btn.title = active ? 'CodeMark: 点击关闭批注模式' : 'CodeMark: 点击开启批注模式'
}

async function loadAnnotations(port: number) {
  try {
    const res = await fetch(`http://localhost:${port}/api/annotations`)
    const data = await res.json() as { annotations: Annotation[] }
    data.annotations.forEach(a => annotationUI!.addMarker(a))
  } catch {
    // Server might not be ready yet
  }
}
