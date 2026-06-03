export type TaskState = 'pending' | 'analyzing' | 'proposing' | 'applying' | 'verifying' | 'done' | 'failed' | 'rolled-back'

export interface Task {
  id: string
  annotationId: string
  state: TaskState
  diff: string
  summary: string
  aiModel: string
  createdAt: number
}
