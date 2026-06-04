type EventHandler = (payload: unknown) => void

export interface WSMessage {
  event: string
  payload: unknown
  timestamp: number
}

export class WSClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, EventHandler[]>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private url: string

  constructor(port: number) {
    const host = window.location.hostname || 'localhost'
    this.url = `ws://${host}:${port}/codemark`
  }

  connect = () => {
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('[CodeMark] WebSocket connected')
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        const handlers = this.handlers.get(msg.event) || []
        handlers.forEach(h => h(msg.payload))
      } catch (e) {
        console.error('[CodeMark] Failed to parse message', e)
      }
    }

    this.ws.onclose = () => {
      console.log('[CodeMark] WebSocket disconnected, reconnecting...')
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect = () => {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 2000)
  }

  on = (event: string, handler: EventHandler) => {
    if (!this.handlers.has(event)) this.handlers.set(event, [])
    this.handlers.get(event)!.push(handler)
  }

  send = (event: string, payload: unknown) => {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[CodeMark] WebSocket not connected, message dropped')
      return
    }
    const msg: WSMessage = { event, payload, timestamp: Date.now() }
    this.ws.send(JSON.stringify(msg))
  }

  disconnect = () => {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }
}
