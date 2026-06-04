import type { App, ComponentPublicInstance } from 'vue'
import { reportError } from '@codemark/core/frontend'
import { DEFAULT_SERVER_PORT } from '@codemark/core/common'

export const setupErrorHandler = (app: App, serverPort: number) => {
  app.config.errorHandler = (err: unknown, instance: ComponentPublicInstance | null, info: string) => {
    const error = err instanceof Error ? err : new Error(String(err))

    reportError('vue', serverPort || DEFAULT_SERVER_PORT, {
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

export const createErrorBoundary = (serverPort: number) => {
  return (err: unknown, instance: ComponentPublicInstance | null, info: string) => {
    const error = err instanceof Error ? err : new Error(String(err))

    reportError('vue', serverPort || DEFAULT_SERVER_PORT, {
      type: 'vue-error-boundary',
      message: error.message,
      stack: error.stack || '',
      requestId: '',
      componentInfo: info,
    })
    return false
  }
}
