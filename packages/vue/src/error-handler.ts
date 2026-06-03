import type { App, ComponentPublicInstance } from 'vue'

export function setupErrorHandler(app: App, serverPort: number) {
  app.config.errorHandler = (err: unknown, instance: ComponentPublicInstance | null, info: string) => {
    const error = err instanceof Error ? err : new Error(String(err))

    const errorPayload = {
      source: 'frontend' as const,
      type: 'vue-error',
      message: error.message,
      stack: error.stack || '',
      requestId: '',
      componentInfo: info,
      componentName: instance?.$options?.name || 'Unknown',
    }

    // Send to Agent Server via fetch
    fetch(`http://localhost:${serverPort}/api/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorPayload),
    }).catch(() => {})

    console.error('[CodeMark] Vue error captured:', error.message, info)
  }
}

// For use in Vue components as onErrorCaptured
export function createErrorBoundary(serverPort: number) {
  return (err: Error, instance: ComponentPublicInstance | null, info: string) => {
    fetch(`http://localhost:${serverPort}/api/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'frontend',
        type: 'vue-error-boundary',
        message: err.message,
        stack: err.stack || '',
        requestId: '',
        componentInfo: info,
      }),
    }).catch(() => {})
    return false // prevent propagation
  }
}
