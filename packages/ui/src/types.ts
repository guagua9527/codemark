import type { Annotation } from '@codemark/protocol'

export interface ComponentMeta {
  filePath: string
  line: number
  column: number
  componentName: string
}

export interface AnnotationInputData {
  selector: string
  content: string
  intent: 'auto' | 'fix' | 'feature' | 'refactor'
  sourceFile: string
  sourceLine: number
  componentName: string
}

export type { Annotation }
