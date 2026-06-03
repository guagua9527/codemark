export interface Annotation {
  id: string
  selector: string
  content: string
  sourceFile: string
  sourceLine: number
  componentName: string
  createdAt: number
  status: 'open' | 'resolved'
}

export interface FixResult {
  id: string
  annotationId: string
  diff: string
  summary: string
  status: 'pending' | 'applied' | 'failed'
}

export interface WSMessage {
  event: string
  payload: unknown
  timestamp: number
}
