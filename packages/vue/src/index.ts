import type { App } from 'vue'
import { registerMetaProvider } from '@codemark/core/frontend'
import { setupErrorHandler } from './error-handler.js'

export interface VueAdapterOptions {
  serverPort?: number
}

export const createVueAdapter = (options: VueAdapterOptions = {}) => {
  return {
    install(app: App) {
      setupErrorHandler(app, options.serverPort || 3001)
    },
  }
}

/**
 * Get Vue component metadata from a DOM element.
 * Walks up the DOM to find the nearest Vue component instance.
 *
 * Note: `line` is always 0 because Vue does not expose source line info at runtime.
 * The return type is kept as-is to conform to the protocol spec.
 */
export const getVueComponentMeta = (element: Element): {
  filePath: string
  componentName: string
  line: number
} | null => {
  let el: Element | null = element
  while (el) {
    const vueComp = (el as any).__vueParentComponent
    if (vueComp?.type?.__file) {
      return {
        filePath: vueComp.type.__file,
        componentName: vueComp.type.name || vueComp.type.__name || 'Unknown',
        line: 0,
      }
    }
    el = el.parentElement
  }
  return null
}

/**
 * Create a ComponentMetaProvider for Vue 3 projects.
 * Finds the enclosing component (skips child components) and its root element.
 */
export const createVueMetaProvider = () => {
  const findComponentAtDepth = (element: Element, depth: number) => {
    // Collect distinct enclosing components
    const components: { file: string; name: string; element: Element; instance: any }[] = []
    let el: Element | null = element
    let lastFile: string | null = null

    while (el) {
      const vueComp = (el as any).__vueParentComponent
      if (vueComp?.type?.__file) {
        const file = vueComp.type.__file
        if (file !== lastFile) {
          components.push({
            file,
            name: vueComp.type.name || vueComp.type.__name || 'Unknown',
            element: el,
            instance: vueComp,
          })
          lastFile = file
        }
      }
      el = el.parentElement
    }

    if (components.length === 0) return null

    const idx = Math.min(depth - 1, components.length - 1)
    const comp = components[idx]

    // Walk to root element of this component
    let rootEl: Element = comp.element
    let walkEl: Element | null = rootEl.parentElement
    while (walkEl) {
      const vueComp = (walkEl as any).__vueParentComponent
      if (vueComp?.type?.__file === comp.file) {
        rootEl = walkEl
      } else {
        break
      }
      walkEl = walkEl.parentElement
    }

    return {
      filePath: comp.file,
      line: parseInt(rootEl.getAttribute('data-codemark-line') || '0'),
      column: 0,
      componentName: comp.name,
      componentRootElement: rootEl,
      targetElement: element,
      componentInstance: comp.instance,
      instanceType: 'vue',
      depth: idx + 1,
      maxDepth: components.length,
    }
  }

  return {
    getComponentMeta: (element: Element, depth = 1) => findComponentAtDepth(element, depth),
  }
}

export { setupErrorHandler, createErrorBoundary } from './error-handler.js'
export { codemarkVueSourcePlugin } from './vite-plugin.js'

// Self-register as meta provider
registerMetaProvider('@codemark/vue', createVueMetaProvider())
