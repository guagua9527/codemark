export { CodeMarkErrorBoundary } from './error-boundary.js'
export type { CodeMarkErrorBoundaryProps } from './error-boundary.js'
export { captureError } from './error-handler.js'

/**
 * Get React component metadata from a DOM element.
 * Walks the React fiber tree to find the nearest component with source info.
 *
 * Note: `line` and `column` are only available in development mode with source maps.
 */
export function getReactComponentMeta(element: Element): {
  filePath: string
  componentName: string
  line: number
  column: number
} | null {
  const reactInternal = Object.keys(element).find(
    k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
  )
  if (!reactInternal) return null

  const fiber = (element as any)[reactInternal]
  let current = fiber

  while (current) {
    if (current._debugSource) {
      return {
        filePath: current._debugSource.fileName,
        componentName: current.type?.name || current.type?.displayName || 'Unknown',
        line: current._debugSource.lineNumber,
        column: current._debugSource.columnNumber,
      }
    }
    if (current.type?.name || current.type?.displayName) {
      return {
        filePath: current._debugOwner?.elementType?.__source?.fileName || '',
        componentName: current.type.name || current.type.displayName,
        line: current._debugOwner?.elementType?.__source?.lineNumber || 0,
        column: current._debugOwner?.elementType?.__source?.columnNumber || 0,
      }
    }
    current = current.return
  }

  return null
}
