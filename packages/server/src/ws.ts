import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import type {
  WSMessage,
  AdapterRegisterPayload,
  BackendRoutesPayload,
  BackendErrorPayload,
  BackendLogPayload,
  BackendSourceResponsePayload,
  AnnotationUpdatePayload,
  AnnotationResolvePayload,
} from '@codemark/protocol'
import { Store } from './store.js'
import { AdapterRegistry } from './adapter-registry.js'

type BroadcastFn = (event: string, payload: unknown) => void

export function createWSServer(server: Server, store: Store, adapterRegistry: AdapterRegistry): BroadcastFn {
  const wss = new WebSocketServer({ server, path: '/codemark' })

  wss.on('connection', (ws) => {
    console.log('[CodeMark] Client connected')

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as WSMessage
        handleMessage(ws, msg, store, adapterRegistry, broadcast)
      } catch (e) {
        console.error('[CodeMark] Invalid message', e)
      }
    })

    ws.on('close', () => {
      console.log('[CodeMark] Client disconnected')
      adapterRegistry.removeBySocket(ws)
    })
  })

  function broadcast(event: string, payload: unknown) {
    const msg = { event, payload, timestamp: Date.now() } as WSMessage
    const data = JSON.stringify(msg)
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  }

  return broadcast
}

function handleMessage(ws: WebSocket, msg: WSMessage, store: Store, adapterRegistry: AdapterRegistry, broadcast: BroadcastFn) {
  const event = msg.event as string
  switch (event) {
    // Adapter registration
    case 'adapter:register': {
      const payload = msg.payload as AdapterRegisterPayload
      const info = adapterRegistry.register(payload, ws)
      ws.send(JSON.stringify({
        event: 'adapter:registered',
        payload: { adapterId: info.id },
        timestamp: Date.now(),
      } satisfies WSMessage<'adapter:registered'>))
      console.log(`[CodeMark] Adapter registered: ${info.type} (${info.language}/${info.framework})`)
      break
    }

    // Adapter heartbeat
    case 'adapter:heartbeat': {
      adapterRegistry.heartbeat(ws)
      break
    }

    // Backend routes update
    case 'backend:routes': {
      const { routes } = msg.payload as BackendRoutesPayload
      adapterRegistry.updateRoutes(ws, routes)
      console.log(`[CodeMark] Backend routes updated: ${routes.length} routes`)
      break
    }

    // Backend error report
    case 'backend:error': {
      const { error } = msg.payload as BackendErrorPayload
      console.log(`[CodeMark] Backend error: ${error.message}`)
      broadcast('backend:error', { error })
      break
    }

    // Backend log entry
    case 'backend:log': {
      const { log } = msg.payload as BackendLogPayload
      broadcast('backend:log', { log })
      break
    }

    // Backend source code response
    case 'backend:source-response': {
      const payload = msg.payload as BackendSourceResponsePayload
      adapterRegistry.handleSourceResponse(payload)
      break
    }

    // Annotation events (from frontend client)
    case 'annotation:create': {
      const { annotation: data } = msg.payload as { annotation: any }
      const annotation = store.createAnnotation(data)
      broadcast('annotation:create', { annotation })
      break
    }
    case 'annotation:update': {
      const { id, content, intent } = msg.payload as AnnotationUpdatePayload
      store.updateAnnotation(id, { content, intent } as any)
      broadcast('annotation:update', msg.payload)
      break
    }
    case 'annotation:delete': {
      const { id } = msg.payload as { id: string }
      store.deleteAnnotation(id)
      broadcast('annotation:delete', { id })
      break
    }
    case 'annotation:resolve': {
      const { id } = msg.payload as AnnotationResolvePayload
      store.updateAnnotation(id, { status: 'resolved' } as any)
      broadcast('annotation:resolve', { id })
      break
    }

    // Fix trigger
    case 'fix:trigger': {
      const { annotationId } = msg.payload as { annotationId: string }
      const annotation = store.getAnnotation(annotationId)
      if (annotation) {
        broadcast('fix:start', { annotationId, message: 'AI 分析中...' })
      }
      break
    }
  }
}
