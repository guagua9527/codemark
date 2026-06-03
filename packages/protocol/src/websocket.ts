import type { Annotation } from './annotation.js'
import type { Task } from './task.js'
import type { ErrorEvent, LogEntry } from './error.js'
import type { RouteInfo, APISchema } from './route.js'
import type { AdapterInfo } from './adapter.js'

export interface WSMessage {
  event: string
  payload: unknown
  timestamp: number
}

// Adapter events (Adapter → Server)
export interface AdapterRegisterPayload {
  type: 'frontend' | 'backend'
  language: string
  framework: string
}

export interface AdapterRegisteredPayload {
  adapterId: string
}

export interface BackendRoutesPayload {
  routes: RouteInfo[]
}

export interface BackendErrorPayload {
  error: ErrorEvent
}

export interface BackendLogPayload {
  log: LogEntry
}

export interface BackendSourceRequestPayload {
  filePath: string
  requestId: string
}

export interface BackendSourceResponsePayload {
  requestId: string
  content: string
  error?: string
}

// Annotation events (Client → Server)
export interface AnnotationCreatePayload {
  annotation: Omit<Annotation, 'id' | 'createdAt' | 'status'>
}

export interface AnnotationUpdatePayload {
  id: string
  content?: string
  intent?: Annotation['intent']
}

export interface AnnotationDeletePayload {
  id: string
}

export interface AnnotationResolvePayload {
  id: string
}

// Task events (Server → Client)
export interface TaskStartPayload {
  taskId: string
  annotationId: string
}

export interface TaskProgressPayload {
  taskId: string
  message: string
}

export interface TaskProposalPayload {
  taskId: string
  diff: string
  summary: string
}

export interface TaskResultPayload {
  taskId: string
  status: 'applied' | 'failed'
  summary?: string
  error?: string
}

export interface TaskRollbackPayload {
  taskId: string
  message: string
}
