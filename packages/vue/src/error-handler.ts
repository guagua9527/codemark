import type { App, ComponentPublicInstance } from 'vue'
import type { ErrorEvent } from '@codemark/protocol'

let errorIdCounter = 0

const nextErrorId = (): string => {
  return `vue-${Date.now()}-${++errorIdCounter}`
}

const reportError = (serverPort: number, payload: Omit<ErrorEvent, 'id'> & Record<string, unknown>) => {
  const body: ErrorEvent & Record<string, unknown> = {
    id: nextErrorId(),
    ...payload,
  }
  fetch(`http://localhost:${serverPort}/api/errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export const setupErrorHandler = (app: App, serverPort: number) => {
  app.config.errorHandler = (err: unknown, instance: ComponentPublicInstance | null, info: string) => {
    const error = err instanceof Error ? err : new Error(String(err))

    reportError(serverPort, {
      source: 'frontend',
      type: 'vue-error',
      message: error.message,
      stack: error.stack || '',
      requestId: '',
      componentInfo: info,
      componentName: instance?.$options?.name || 'Unknown',
    })

    console.error('[CodeMark] Vue error captured:', error.message, info)
  }
}

// For use in Vue components as onErrorCaptured
export const createErrorBoundary = (serverPort: number) => {
  return (err: unknown, instance: ComponentPublicInstance | null, info: string) => {
    const error = err instanceof Error ? err : new Error(String(err))

    reportError(serverPort, {
      source: 'frontend',
      type: 'vue-error-boundary',
      message: error.message,
      stack: error.stack || '',
      requestId: '',
      componentInfo: info,
    })
    return false // prevent propagation
  }
}
