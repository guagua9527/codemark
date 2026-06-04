import { createRoot } from 'react-dom/client'
import { CodeMarkErrorBoundary } from '@codemark/react'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <CodeMarkErrorBoundary serverPort={3001} fallback={<div>Something went wrong.</div>}>
    <App />
  </CodeMarkErrorBoundary>,
)
