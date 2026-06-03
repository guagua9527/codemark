import type { Annotation } from './annotation.js'
import type { Task } from './task.js'
import type { ErrorEvent, LogEntry } from './error.js'
import type { RouteInfo } from './route.js'
import type { AdapterType } from './adapter.js'

export type WSMessageMap = {
  'adapter:register': AdapterRegisterPayload
  'adapter:registered': AdapterRegisteredPayload
  'backend:routes': BackendRoutesPayload
  'backend:error': BackendErrorPayload
  'backend:log': BackendLogPayload
  'backend:source-request': BackendSourceRequestPayload
  'backend:source-response': BackendSourceResponsePayload
  'annotation:create': AnnotationCreatePayload
  'annotation:update': AnnotationUpdatePayload
  'annotation:delete': AnnotationDeletePayload
  'annotation:resolve': AnnotationResolvePayload
  'task:start': TaskStartPayload
  'task:progress': TaskProgressPayload
  'task:proposal': TaskProposalPayload
  'task:result': TaskResultPayload
  'task:rollback': TaskRollbackPayload
}

export type WSEventName = keyof WSMessageMap

export interface WSMessage<E extends WSEventName = WSEventName> {
  event: E
  payload: WSMessageMap[E]
  timestamp: number
}

// Adapter events (Adapter → Server)
export interface AdapterRegisterPayload {
  type: AdapterType
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
