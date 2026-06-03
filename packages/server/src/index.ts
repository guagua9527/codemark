import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { Store } from './store.js'
import { createWSServer } from './ws.js'
import { createAPI } from './api.js'
import { CodeAgent } from './ai.js'

const PORT = parseInt(process.env.CODEMARK_PORT || '3001')

// Resolve PROJECT_ROOT: relative paths are resolved against the monorepo root
// (two levels up from packages/server/src/)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.resolve(__dirname, '../../..')
const rawRoot = process.env.PROJECT_ROOT || process.cwd()
const PROJECT_ROOT = path.isAbsolute(rawRoot) ? rawRoot : path.resolve(monorepoRoot, rawRoot)

const store = new Store()
const codeAgent = new CodeAgent(PROJECT_ROOT)

// Create a broadcast placeholder, will be set after WS server starts
let broadcast: (event: string, payload: unknown) => void = () => {}

const app = createAPI(store, codeAgent, (...args) => broadcast(...args))
const server = http.createServer(app)

// Start WebSocket server and get broadcast function
broadcast = createWSServer(server, store)

server.listen(PORT, () => {
  console.log(`[CodeMark] Server running on http://localhost:${PORT}`)
  console.log(`[CodeMark] WebSocket on ws://localhost:${PORT}/codemark`)
  console.log(`[CodeMark] Project root: ${PROJECT_ROOT}`)
})
