import { describe, it, expect } from 'vitest'
import { Store } from '../store.js'

describe('Store', () => {
  it('creates and retrieves annotations', () => {
    const store = new Store()
    const annotation = store.createAnnotation({
      selector: '#btn',
      content: 'broken',
      intent: 'fix',
      sourceFile: 'src/App.vue',
      sourceLine: 10,
      componentName: 'App',
    })
    expect(annotation.id).toBeDefined()
    expect(annotation.status).toBe('open')
    expect(store.getAnnotation(annotation.id)).toBe(annotation)
  })

  it('lists all annotations', () => {
    const store = new Store()
    store.createAnnotation({ selector: '#a', content: 'a', intent: 'fix', sourceFile: 'a.ts', sourceLine: 1, componentName: 'A' })
    store.createAnnotation({ selector: '#b', content: 'b', intent: 'fix', sourceFile: 'b.ts', sourceLine: 2, componentName: 'B' })
    expect(store.getAnnotations()).toHaveLength(2)
  })

  it('deletes annotations', () => {
    const store = new Store()
    const a = store.createAnnotation({ selector: '#a', content: 'a', intent: 'fix', sourceFile: 'a.ts', sourceLine: 1, componentName: 'A' })
    store.deleteAnnotation(a.id)
    expect(store.getAnnotation(a.id)).toBeUndefined()
  })

  it('updates annotation fields', () => {
    const store = new Store()
    const a = store.createAnnotation({ selector: '#a', content: 'old', intent: 'auto', sourceFile: 'a.ts', sourceLine: 1, componentName: 'A' })
    store.updateAnnotation(a.id, { content: 'new', intent: 'fix' })
    expect(store.getAnnotation(a.id)!.content).toBe('new')
    expect(store.getAnnotation(a.id)!.intent).toBe('fix')
  })

  it('creates and updates tasks', () => {
    const store = new Store()
    const a = store.createAnnotation({ selector: '#a', content: 'a', intent: 'fix', sourceFile: 'a.ts', sourceLine: 1, componentName: 'A' })
    const task = store.createTask(a.id)
    expect(task.state).toBe('pending')
    store.updateTaskState(task.id, 'analyzing')
    expect(store.getTask(task.id)!.state).toBe('analyzing')
    store.setTaskResult(task.id, '--- a\n+++ b', 'fixed', 'deepseek')
    expect(store.getTask(task.id)!.diff).toBe('--- a\n+++ b')
  })
})
