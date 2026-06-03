export interface Annotation {
  id: string
  selector: string           // CSS selector (frontend) or API path (backend)
  content: string            // user description
  intent: 'auto' | 'fix' | 'feature' | 'refactor'
  sourceFile: string
  sourceLine: number
  componentName: string
  status: 'open' | 'resolved'
  createdAt: number
}

export interface Comment {
  id: string
  annotationId: string
  author: 'user' | 'ai' | 'system'
  content: string
  createdAt: number
}
