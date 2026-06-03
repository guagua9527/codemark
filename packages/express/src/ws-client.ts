import WebSocket from 'ws'
import type { WSMessage } from '@codemark/protocol'

type MessageHandler = (event: string, payload: unknown) => void

export class AgentServerClient {
  private ws: WebSocket | null = null
  private url: string
  private handlers: MessageHandler[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private adapterId: string | null = null

  constructor(serverUrl: string) {
    this.url = serverUrl
  }

  connect() {
    this.ws = new WebSocket(this.url)

    this.ws.on('open', () => {
      console.log('[CodeMark Express] Connected to Agent Server')
      this.register()
    })

    this.ws.on('message', (data) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString())
        this.handleMessage(msg)
      } catch (e) {
        console.error('[CodeMark Express] Invalid message', e)
      }
    })

    this.ws.on('close', () => {
      console.log('[CodeMark Express] Disconnected, reconnecting...')
      this.scheduleReconnect()
    })

    this.ws.on('error', () => {
      this.ws?.close()
    })
  }

  private register() {
    this.send('adapter:register', {
      type: 'backend',
      language: 'javascript',
      framework: 'express',
    })
  }

  private handleMessage(msg: WSMessage) {
    switch (msg.event) {
      case 'adapter:registered': {
        const { adapterId } = msg.payload as { adapterId: string }
        this.adapterId = adapterId
        console.log(`[CodeMark Express] Registered as ${adapterId}`)
        break
      }
    }

    this.handlers.forEach(h => h(msg.event, msg.payload))
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler)
  }

  send(event: string, payload: unknown) {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    const msg = { event, payload, timestamp: Date.now() } as WSMessage
    this.ws.send(JSON.stringify(msg))
  }

  getAdapterId(): string | null {
    return this.adapterId
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 2000)
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }
}
