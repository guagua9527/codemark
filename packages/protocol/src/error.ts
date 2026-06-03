export interface ErrorEvent {
  id: string
  source: 'frontend' | 'backend'
  type: string
  message: string
  stack: string
  requestId: string
  linkedAnnotationId?: string
}

export interface LogEntry {
  id: string
  requestId: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: number
}
