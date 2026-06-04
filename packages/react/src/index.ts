import { registerMetaProvider } from '@codemark/core/frontend'

export { CodeMarkErrorBoundary } from './error-boundary.js'
export type { CodeMarkErrorBoundaryProps } from './error-boundary.js'
export { captureError } from './error-handler.js'

/**
 * Get React component metadata from a DOM element.
 * Walks the React fiber tree to find the nearest component with source info.
 *
 * Note: `line` and `column` are only available in development mode with source maps.
 */
export const getReactComponentMeta = (element: Element): {
  filePath: string
  componentName: string
  line: number
  column: number
} | null => {
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

/**
 * Find the root DOM element of the React component that contains the given element.
 */
const findReactComponentRoot = (element: Element): Element | null => {
  const fiberKey = Object.keys(element).find(k => k.startsWith('__reactFiber'))
  if (!fiberKey) return null

  const fiber = (element as any)[fiberKey]
  if (!fiber) return null

  // Find the nearest React component (function type) in the fiber tree
  let current = fiber
  let componentFn: Function | null = null
  while (current) {
    if (typeof current.type === 'function') {
      componentFn = current.type
      break
    }
    current = current.return
  }
  if (!componentFn) return null

  // Walk up the DOM tree to find the root element of this component
  let el: Element | null = element
  while (el) {
    const parent: Element | null = el.parentElement
    if (!parent) break
    const parentKey = Object.keys(parent).find(k => k.startsWith('__reactFiber'))
    if (!parentKey) break
    const parentFiber = (parent as any)[parentKey]
    if (!parentFiber || parentFiber.type !== componentFn) break
    el = parent
  }
  return el
}

/**
 * Create a ComponentMetaProvider for React projects.
 */
export const createReactMetaProvider = () => {
  return {
    getComponentMeta: (element: Element, depth = 1) => {
      const reactInternal = Object.keys(element).find(
        k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
      )
      if (!reactInternal) return null

      const fiber = (element as any)[reactInternal]
      if (!fiber?._debugSource) return null

      // Walk up fiber tree, skip (depth - 1) function components
      let current = fiber
      let componentName = 'Unknown'
      let found = 0
      let maxDepth = 0
      let steps = 0
      while (current && steps < 50) {
        const t = current.type
        if (typeof t === 'function') {
          const name = t.displayName || t.name
          if (name) {
            found++
            if (found >= depth && componentName === 'Unknown') { componentName = name }
          }
        }
        const et = current.elementType
        if (typeof et === 'function') {
          const name = et.displayName || et.name
          if (name) {
            found++
            if (found >= depth && componentName === 'Unknown') { componentName = name }
          }
        }
        current = current.return
        steps++
      }
      maxDepth = found

      if (found < depth) return null

      return {
        filePath: fiber._debugSource.fileName,
        line: fiber._debugSource.lineNumber,
        column: fiber._debugSource.columnNumber,
        componentName,
        componentRootElement: findReactComponentRoot(element),
        targetElement: element,
        depth,
        maxDepth,
      }
    },
  }
}

// Self-register as meta provider
registerMetaProvider('@codemark/react', createReactMetaProvider())
