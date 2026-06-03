import http from 'http'
import { Store } from './store.js'
import { createWSServer } from './ws.js'
import { createAPI } from './api.js'
import { AIFixer } from './ai.js'

const PORT = parseInt(process.env.CODEMARK_PORT || '3001')
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd()

const store = new Store()
const aiFixer = new AIFixer(PROJECT_ROOT)

// Create a broadcast placeholder, will be set after WS server starts
let broadcast: (event: string, payload: unknown) => void = () => {}

const app = createAPI(store, aiFixer, (...args) => broadcast(...args))
const server = http.createServer(app)

// Start WebSocket server and get broadcast function
broadcast = createWSServer(server, store)

server.listen(PORT, () => {
  console.log(`[CodeMark] Server running on http://localhost:${PORT}`)
  console.log(`[CodeMark] WebSocket on ws://localhost:${PORT}/codemark`)
  console.log(`[CodeMark] Project root: ${PROJECT_ROOT}`)
})
