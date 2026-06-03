import express, { Express } from 'express'
import { Store } from './store.js'
import { AIFixer } from './ai.js'

export function createAPI(store: Store, aiFixer: AIFixer, broadcast: (event: string, payload: unknown) => void): Express {
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

    broadcast('fix:progress', { annotationId, message: 'AI 分析中...' })

    try {
      const fix = await aiFixer.fix(annotation)
      store.createFix(annotationId, fix.diff, fix.summary)
      broadcast('fix:progress', { annotationId, message: '应用修复...' })

      await aiFixer.applyDiff(annotation.sourceFile, fix.diff)
      broadcast('fix:result', { annotationId, status: 'applied', summary: fix.summary })

      res.json({ fix: { diff: fix.diff, summary: fix.summary } })
    } catch (err: any) {
      broadcast('fix:result', { annotationId, status: 'failed', error: err.message })
      res.status(500).json({ error: err.message })
    }
  })

  return app
}
