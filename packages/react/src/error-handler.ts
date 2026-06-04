import { reportError } from '@codemark/core/frontend'
import { DEFAULT_SERVER_PORT } from '@codemark/core/common'

export interface CodeMarkErrorInfo {
  componentStack: string
  digest?: string
}

export const captureError = (error: Error, errorInfo: CodeMarkErrorInfo, serverPort: number) => {
  reportError('react', serverPort || DEFAULT_SERVER_PORT, {
    type: 'react-error',
    message: error.message,
    stack: error.stack || '',
    requestId: '',
    componentStack: errorInfo.componentStack,
  })
  console.error('[CodeMark] React error captured:', error.message)
}
