import type { RouteInfo, APISchema } from './route.js'
import type { ErrorEvent, LogEntry } from './error.js'

export type AdapterType = 'frontend' | 'backend'

export interface AdapterInfo {
  id: string
  type: AdapterType
  language: string          // 'javascript' | 'java' | 'python' | ...
  framework: string         // 'express' | 'spring-boot' | 'vue' | 'react' | ...
  connectedAt: number
}

export interface BackendAdapter {
  getRoutes(): RouteInfo[]
  onLog(cb: (entry: LogEntry) => void): void
  onError(cb: (err: ErrorEvent) => void): void
  getSchemas(): APISchema[]
  restart(): Promise<void>
}
