import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import type { AgentServerClient } from './ws-client.js'
import type { ErrorEvent } from '@codemark/protocol'

/**
 * Express error-handling middleware that captures errors
 * and sends them to Agent Server.
 */
export function createErrorCapture(client: AgentServerClient): ErrorRequestHandler {
  return (err: Error, req: Request, _res: Response, next: NextFunction) => {
    const requestId = (req as any).__codemark_request_id || ''

    const errorEvent: Omit<ErrorEvent, 'id'> = {
      source: 'backend',
      type: err.name || 'Error',
      message: err.message,
      stack: err.stack || '',
      requestId,
    }

    client.send('backend:error', { error: errorEvent })

    next(err)
  }
}
