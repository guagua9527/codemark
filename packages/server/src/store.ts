import { randomUUID } from 'crypto'
import type { Annotation, Task, TaskState } from '@codemark/protocol'

export class Store {
  private annotations = new Map<string, Annotation>()
  private tasks = new Map<string, Task>()

  createAnnotation(data: Omit<Annotation, 'id' | 'createdAt' | 'status'>): Annotation {
    const annotation: Annotation = {
      id: randomUUID(),
      ...data,
      createdAt: Date.now(),
      status: 'open',
    }
    this.annotations.set(annotation.id, annotation)
    return annotation
  }

  getAnnotations(): Annotation[] {
    return Array.from(this.annotations.values())
  }

  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.get(id)
  }

  updateAnnotation(id: string, data: Partial<Pick<Annotation, 'content' | 'intent' | 'status'>>): Annotation | undefined {
    const annotation = this.annotations.get(id)
    if (!annotation) return undefined
    Object.assign(annotation, data)
    return annotation
  }

  deleteAnnotation(id: string): boolean {
    return this.annotations.delete(id)
  }

  createTask(annotationId: string): Task {
    const task: Task = {
      id: randomUUID(),
      annotationId,
      state: 'pending',
      diff: '',
      summary: '',
      aiModel: '',
      createdAt: Date.now(),
    }
    this.tasks.set(task.id, task)
    return task
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id)
  }

  updateTaskState(id: string, state: TaskState): void {
    const task = this.tasks.get(id)
    if (task) task.state = state
  }

  setTaskResult(id: string, diff: string, summary: string, aiModel: string): void {
    const task = this.tasks.get(id)
    if (task) {
      task.diff = diff
      task.summary = summary
      task.aiModel = aiModel
    }
  }
}
