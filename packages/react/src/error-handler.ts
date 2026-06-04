import type { ErrorEvent } from '@codemark/protocol'

let errorIdCounter = 0

function nextErrorId(): string {
  return `react-${Date.now()}-${++errorIdCounter}`
}

function reportError(serverPort: number, payload: Omit<ErrorEvent, 'id'> & Record<string, unknown>) {
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

export interface CodeMarkErrorInfo {
  componentStack: string
  digest?: string
}

export function captureError(error: Error, errorInfo: CodeMarkErrorInfo, serverPort: number) {
  reportError(serverPort, {
    source: 'frontend',
    type: 'react-error',
    message: error.message,
    stack: error.stack || '',
    requestId: '',
    componentStack: errorInfo.componentStack,
  })
  console.error('[CodeMark] React error captured:', error.message)
}
