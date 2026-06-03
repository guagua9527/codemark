import type { Express } from 'express'
import type { RouteInfo } from '@codemark/protocol'

/**
 * Scans an Express app to extract all registered routes.
 * Uses app._router.stack to walk the middleware/route stack.
 */
export function scanRoutes(app: Express): RouteInfo[] {
  const routes: RouteInfo[] = []
  const stack = (app as any)._router?.stack || []

  function walkStack(layers: any[], prefix: string = '') {
    for (const layer of layers) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase())
        for (const method of methods) {
          routes.push({
            method,
            path: prefix + layer.route.path,
            handlerFile: extractSourceFile(layer.route.stack),
            handlerLine: 0,
            middlewareChain: extractMiddlewareNames(layer.route.stack),
          })
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        const routerPrefix = layer.regexp?.source
          ?.replace(/\\/g, '')
          ?.replace(/\^/g, '')
          ?.replace(/\(\?:\?\(\?=\\\/\|\$\)\)/g, '') || ''
        walkStack(layer.handle.stack, prefix + routerPrefix)
      }
    }
  }

  walkStack(stack)
  return routes
}

function extractSourceFile(stack: any[]): string {
  for (const layer of stack || []) {
    if (layer.handle?.__codemark_source) {
      return layer.handle.__codemark_source
    }
  }
  return ''
}

function extractMiddlewareNames(stack: any[]): string[] {
  return (stack || [])
    .map(l => l.name || 'anonymous')
    .filter(n => n !== '<anonymous>')
}
