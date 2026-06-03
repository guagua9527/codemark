import { WebSocket } from 'ws'
import type { AdapterInfo, AdapterType, RouteInfo, BackendSourceResponsePayload } from '@codemark/protocol'

interface RegisteredAdapter {
  info: AdapterInfo
  socket: WebSocket
  routes: RouteInfo[]
  lastHeartbeat: number
}

type SourceCallback = (content: string, error?: string) => void

export class AdapterRegistry {
  private adapters = new Map<string, RegisteredAdapter>()
  private socketToId = new Map<WebSocket, string>()
  private sourceCallbacks = new Map<string, SourceCallback>()
  private nextId = 1

  register(data: { type: AdapterType; language: string; framework: string }, socket: WebSocket): AdapterInfo {
    const id = `adapter-${this.nextId++}`
    const info: AdapterInfo = {
      id,
      type: data.type,
      language: data.language,
      framework: data.framework,
      connectedAt: Date.now(),
    }
    const adapter: RegisteredAdapter = {
      info,
      socket,
      routes: [],
      lastHeartbeat: Date.now(),
    }
    this.adapters.set(id, adapter)
    this.socketToId.set(socket, id)
    return info
  }

  removeBySocket(socket: WebSocket): void {
    const id = this.socketToId.get(socket)
    if (id) {
      this.adapters.delete(id)
      this.socketToId.delete(socket)
    }
  }

  heartbeat(socket: WebSocket): void {
    const id = this.socketToId.get(socket)
    if (id) {
      const adapter = this.adapters.get(id)
      if (adapter) adapter.lastHeartbeat = Date.now()
    }
  }

  updateRoutes(socket: WebSocket, routes: RouteInfo[]): void {
    const id = this.socketToId.get(socket)
    if (id) {
      const adapter = this.adapters.get(id)
      if (adapter) adapter.routes = routes
    }
  }

  getAllRoutes(): RouteInfo[] {
    const routes: RouteInfo[] = []
    for (const adapter of this.adapters.values()) {
      routes.push(...adapter.routes)
    }
    return routes
  }

  getBackendAdapter(): RegisteredAdapter | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.info.type === 'backend') return adapter
    }
    return undefined
  }

  registerSourceCallback(requestId: string, callback: SourceCallback): void {
    this.sourceCallbacks.set(requestId, callback)
  }

  handleSourceResponse(payload: BackendSourceResponsePayload): void {
    const callback = this.sourceCallbacks.get(payload.requestId)
    if (callback) {
      this.sourceCallbacks.delete(payload.requestId)
      callback(payload.content, payload.error)
    }
  }

  getAdapterCount(): number {
    return this.adapters.size
  }
}
