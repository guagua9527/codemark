import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import { WSMessage } from './types.js'
import { Store } from './store.js'

type BroadcastFn = (event: string, payload: unknown) => void

export function createWSServer(server: Server, store: Store): BroadcastFn {
  const wss = new WebSocketServer({ server, path: '/codemark' })

  wss.on('connection', (ws) => {
    console.log('[CodeMark] Client connected')

    ws.on('message', (data) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString())
        handleMessage(ws, msg, store, broadcast)
      } catch (e) {
        console.error('[CodeMark] Invalid message', e)
      }
    })

    ws.on('close', () => {
      console.log('[CodeMark] Client disconnected')
    })
  })

  function broadcast(event: string, payload: unknown) {
    const msg: WSMessage = { event, payload, timestamp: Date.now() }
    const data = JSON.stringify(msg)
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  }

  return broadcast
}

function handleMessage(ws: WebSocket, msg: WSMessage, store: Store, broadcast: BroadcastFn) {
  switch (msg.event) {
    case 'annotation:create': {
      const { annotation: data } = msg.payload as { annotation: any }
      const annotation = store.createAnnotation(data)
      broadcast('annotation:create', { annotation })
      break
    }
    case 'annotation:delete': {
      const { id } = msg.payload as { id: string }
      store.deleteAnnotation(id)
      broadcast('annotation:delete', { id })
      break
    }
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
