import type { Annotation } from '@codemark/protocol'

export type { ComponentMeta, ComponentMetaProvider } from '@codemark/core/frontend'

export interface AnnotationInputData {
  selector: string
  content: string
  intent: 'auto' | 'fix' | 'feature' | 'refactor'
  sourceFile: string
  sourceLine: number
  componentName: string
}

export type { Annotation }
