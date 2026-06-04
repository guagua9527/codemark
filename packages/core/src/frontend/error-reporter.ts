import { DEFAULT_SERVER_PORT } from '../common/index.js'

let errorIdCounter = 0

const nextErrorId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${++errorIdCounter}`

export const reportError = (
  sourcePrefix: string,
  serverPort: number,
  payload: Record<string, unknown>,
) => {
  const body = {
    id: nextErrorId(sourcePrefix),
    source: 'frontend',
    ...payload,
  }
  const host = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost'
  fetch(`http://${host}:${serverPort || DEFAULT_SERVER_PORT}/api/errors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}
