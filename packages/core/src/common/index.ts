export const DEFAULT_SERVER_PORT = 3001

export const DATA_CODEMARK_FILE = 'data-codemark-file'
export const DATA_CODEMARK_LINE = 'data-codemark-line'
export const DATA_CODEMARK_COMPONENT = 'data-codemark-component'

export interface CodeMarkBaseOptions {
  serverPort?: number
  /** Glob patterns to include. Default: ['src/**'] */
  includeSource?: string | string[]
  /** Glob patterns to exclude. Default: ['node_modules/**'] */
  excludeSource?: string | string[]
}
