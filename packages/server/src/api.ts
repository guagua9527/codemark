import express, { Express } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { Store } from './store.js'
import { CodeAgent } from './ai.js'

export function createAPI(store: Store, codeAgent: CodeAgent, broadcast: (event: string, payload: unknown) => void): Express {
  const app = express()
  app.use(express.json())

  // CORS for dev
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.sendStatus(200)
    next()
  })

  app.get('/api/annotations', (_req, res) => {
    res.json({ annotations: store.getAnnotations() })
  })

  app.post('/api/annotations', (req, res) => {
    const annotation = store.createAnnotation(req.body)
    broadcast('annotation:create', { annotation })
    res.json({ annotation })
  })

  app.delete('/api/annotations/:id', (req, res) => {
    store.deleteAnnotation(req.params.id)
    broadcast('annotation:delete', { id: req.params.id })
    res.json({ success: true })
  })

  app.post('/api/fix', async (req, res) => {
    const { annotationId } = req.body
    const annotation = store.getAnnotation(annotationId)
    if (!annotation) return res.status(404).json({ error: 'Annotation not found' })

    const task = store.createTask(annotationId)
    broadcast('task:start', { taskId: task.id, annotationId })

    try {
      const sourceContent = await fs.readFile(
        path.resolve((codeAgent as any).projectRoot, annotation.sourceFile),
        'utf-8',
      )

      const result = await codeAgent.execute(
        task.id,
        annotation,
        sourceContent,
        (message) => broadcast('task:progress', { taskId: task.id, message }),
      )

      store.setTaskResult(task.id, result.diff, result.summary, result.aiModel)
      store.updateTaskState(task.id, 'applying')

      await codeAgent.applyDiff(annotation.sourceFile, result.diff)
      store.updateTaskState(task.id, 'done')

      broadcast('task:result', { taskId: task.id, status: 'applied', summary: result.summary })
      res.json({ task: { id: task.id, diff: result.diff, summary: result.summary } })
    } catch (err: any) {
      store.updateTaskState(task.id, 'failed')
      broadcast('task:result', { taskId: task.id, status: 'failed', error: err.message })
      res.status(500).json({ error: err.message })
    }
  })

  return app
}
