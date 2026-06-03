import type { Annotation, RouteInfo, ErrorEvent, LogEntry } from '@codemark/protocol'

export interface AIContext {
  annotation: Annotation
  sourceCode: string
  relatedRoutes: RouteInfo[]
  relatedErrors: ErrorEvent[]
  relatedLogs: LogEntry[]
}

export class ContextBuilder {
  private errors: ErrorEvent[] = []
  private logs: LogEntry[] = []
  private routes: RouteInfo[] = []

  updateRoutes(routes: RouteInfo[]): void {
    this.routes = routes
  }

  addError(error: ErrorEvent): void {
    this.errors.push(error)
    if (this.errors.length > 100) this.errors.shift()
  }

  addLog(log: LogEntry): void {
    this.logs.push(log)
    if (this.logs.length > 500) this.logs.shift()
  }

  build(annotation: Annotation, sourceCode: string): AIContext {
    return {
      annotation,
      sourceCode,
      relatedRoutes: this.findRelatedRoutes(annotation),
      relatedErrors: this.findRelatedErrors(annotation),
      relatedLogs: this.findRelatedLogs(annotation),
    }
  }

  private findRelatedRoutes(annotation: Annotation): RouteInfo[] {
    return this.routes.filter(r => r.handlerFile === annotation.sourceFile)
  }

  private findRelatedErrors(annotation: Annotation): ErrorEvent[] {
    return this.errors
      .filter(e => e.stack.includes(annotation.sourceFile))
      .slice(-5)
  }

  private findRelatedLogs(annotation: Annotation): LogEntry[] {
    return this.logs
      .filter(l => l.level === 'error' || l.level === 'warn')
      .slice(-10)
  }
}
