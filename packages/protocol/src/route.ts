export interface RouteInfo {
  method: string
  path: string
  handlerFile: string
  handlerLine: number
  middlewareChain: string[]
  schema?: APISchema
}

export interface APISchema {
  path: string
  method: string
  params?: Record<string, { type: string; required: boolean }>
  query?: Record<string, { type: string; required: boolean }>
  body?: Record<string, { type: string; required: boolean }>
  response?: Record<string, { type: string }>
}
