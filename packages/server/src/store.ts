import { Annotation, FixResult } from './types.js'
import { randomUUID } from 'crypto'

export class Store {
  private annotations = new Map<string, Annotation>()
  private fixes = new Map<string, FixResult>()

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

  deleteAnnotation(id: string): boolean {
    return this.annotations.delete(id)
  }

  createFix(annotationId: string, diff: string, summary: string): FixResult {
    const fix: FixResult = {
      id: randomUUID(),
      annotationId,
      diff,
      summary,
      status: 'pending',
    }
    this.fixes.set(fix.id, fix)
    return fix
  }

  updateFixStatus(id: string, status: FixResult['status']): void {
    const fix = this.fixes.get(id)
    if (fix) fix.status = status
  }

  getFix(id: string): FixResult | undefined {
    return this.fixes.get(id)
  }
}
