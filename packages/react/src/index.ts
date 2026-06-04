import { registerMetaProvider, isInSourceRoot } from '@codemark/core/frontend'

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
 * Find the root DOM element of a React component by walking down the fiber tree.
 * The first HostComponent (DOM element) in the component's subtree is the root.
 */
const findReactComponentRoot = (fiber: any): Element | null => {
  let current = fiber.child
  while (current) {
    if (current.stateNode instanceof Element) return current.stateNode
    if (current.child) { current = current.child; continue }
    // No child, try sibling
    let sibling = current.sibling
    while (!sibling && current.return) {
      if (current.return === fiber) return null
      current = current.return
      sibling = current.sibling
    }
    current = sibling
  }
  return null
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
      let matchedFiber: any = null
      let found = 0
      let maxDepth = 0
      let steps = 0
      while (current && steps < 50) {
        const t = current.type
        const et = current.elementType
        // Use elementType if available (original function), fallback to type
        const fn = (typeof et === 'function' && et) || (typeof t === 'function' && t) || null
        if (fn) {
          const name = fn.displayName || fn.name
          if (name && !name.startsWith('CodeMark')) {
            // Check source root: component must have source in user code
            const src = current._debugSource?.fileName || current._debugOwner?._debugSource?.fileName
            if (src && !isInSourceRoot(src)) continue
            found++
            if (found >= depth && !matchedFiber) { componentName = name; matchedFiber = current }
          }
        }
        current = current.return
        steps++
      }
      maxDepth = found

      if (found < depth || !matchedFiber?.type) return null

      return {
        filePath: fiber._debugSource.fileName,
        line: fiber._debugSource.lineNumber,
        column: fiber._debugSource.columnNumber,
        componentName,
        componentRootElement: findReactComponentRoot(matchedFiber),
        targetElement: element,
        componentInstance: matchedFiber,
        instanceType: 'react',
        depth,
        maxDepth,
      }
    },
  }
}

// Self-register as meta provider
registerMetaProvider('@codemark/react', createReactMetaProvider())
