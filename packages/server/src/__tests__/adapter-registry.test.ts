import { describe, it, expect, vi } from 'vitest'
import { AdapterRegistry } from '../adapter-registry.js'

function mockSocket(): any {
  return { send: vi.fn(), readyState: 1 }
}

describe('AdapterRegistry', () => {
  it('registers an adapter and returns info', () => {
    const registry = new AdapterRegistry()
    const ws = mockSocket()
    const info = registry.register({ type: 'backend', language: 'javascript', framework: 'express' }, ws)
    expect(info.id).toBeDefined()
    expect(info.type).toBe('backend')
    expect(info.language).toBe('javascript')
    expect(registry.getAdapterCount()).toBe(1)
  })

  it('removes adapter on socket close', () => {
    const registry = new AdapterRegistry()
    const ws = mockSocket()
    registry.register({ type: 'backend', language: 'java', framework: 'spring-boot' }, ws)
    registry.removeBySocket(ws)
    expect(registry.getAdapterCount()).toBe(0)
  })

  it('stores and retrieves routes', () => {
    const registry = new AdapterRegistry()
    const ws = mockSocket()
    registry.register({ type: 'backend', language: 'js', framework: 'express' }, ws)
    registry.updateRoutes(ws, [
      { method: 'GET', path: '/api/users', handlerFile: 'src/routes/users.ts', handlerLine: 10, middlewareChain: [] },
    ])
    expect(registry.getAllRoutes()).toHaveLength(1)
    expect(registry.getAllRoutes()[0].path).toBe('/api/users')
  })

  it('handles source response callbacks', () => {
    const registry = new AdapterRegistry()
    const callback = vi.fn()
    registry.registerSourceCallback('req-1', callback)
    registry.handleSourceResponse({ requestId: 'req-1', content: 'file content' })
    expect(callback).toHaveBeenCalledWith('file content', undefined)
  })
})
