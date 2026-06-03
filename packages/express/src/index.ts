import type { Express, RequestHandler, ErrorRequestHandler } from 'express'
import { AgentServerClient } from './ws-client.js'
import { scanRoutes } from './route-scanner.js'
import { createErrorCapture } from './error-capture.js'
import { createRequestInterceptor } from './request-interceptor.js'
import fs from 'fs/promises'
import path from 'path'

export interface CodeMarkExpressOptions {
  serverUrl?: string    // Agent Server WebSocket URL, default ws://localhost:3001/codemark
  projectRoot?: string  // Project root for source file reading
}

export interface CodeMarkExpress {
  middleware: RequestHandler
  errorHandler: ErrorRequestHandler
  client: AgentServerClient
}

export function codemark(options: CodeMarkExpressOptions = {}): CodeMarkExpress {
  const serverUrl = options.serverUrl || 'ws://localhost:3001/codemark'
  const projectRoot = options.projectRoot || process.cwd()

  const client = new AgentServerClient(serverUrl)

  // Handle source read requests from Agent Server
  client.onMessage(async (event, payload) => {
    if (event === 'backend:source-request') {
      const { filePath, requestId } = payload as { filePath: string; requestId: string }
      try {
        const fullPath = path.resolve(projectRoot, filePath)
        const content = await fs.readFile(fullPath, 'utf-8')
        client.send('backend:source-response', { requestId, content })
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        client.send('backend:source-response', { requestId, content: '', error: message })
      }
    }
  })

  client.connect()

  return {
    middleware: createRequestInterceptor(client),
    errorHandler: createErrorCapture(client),
    client,
  }
}

/**
 * Call this after all routes are registered to scan and push routes to Agent Server.
 */
export function scanAndPushRoutes(app: Express, client: AgentServerClient): void {
  const routes = scanRoutes(app)
  client.send('backend:routes', { routes })
  console.log(`[CodeMark Express] Pushed ${routes.length} routes to Agent Server`)
}

export { AgentServerClient } from './ws-client.js'
export { scanRoutes } from './route-scanner.js'
