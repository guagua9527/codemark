import type { App } from 'vue'
import { setupErrorHandler } from './error-handler.js'

export interface VueAdapterOptions {
  serverPort?: number
}

export function createVueAdapter(options: VueAdapterOptions = {}) {
  return {
    install(app: App) {
      setupErrorHandler(app, options.serverPort || 3001)
    },
  }
}

/**
 * Get Vue component metadata from a DOM element.
 * Walks up the DOM to find the nearest Vue component instance.
 */
export function getVueComponentMeta(element: Element): {
  filePath: string
  componentName: string
  line: number
} | null {
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

export { setupErrorHandler, createErrorBoundary } from './error-handler.js'
