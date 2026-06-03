import type { Request, Response, NextFunction } from 'express'
import type { AgentServerClient } from './ws-client.js'
import { randomUUID } from 'crypto'

/**
 * Express middleware that:
 * 1. Generates/propagates X-Request-ID
 * 2. Logs request start/end to Agent Server
 */
export function createRequestInterceptor(client: AgentServerClient) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || randomUUID()
    const startTime = Date.now()

    ;(req as any).__codemark_request_id = requestId
    res.setHeader('X-Request-ID', requestId)

    res.on('finish', () => {
      const duration = Date.now() - startTime
      client.send('backend:log', {
        log: {
          id: randomUUID(),
          requestId,
          level: res.statusCode >= 400 ? 'error' : 'info',
          message: `${req.method} ${req.path} ${res.statusCode} ${duration}ms`,
          timestamp: Date.now(),
        },
      })
    })

    next()
  }
}
