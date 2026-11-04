import { describe, expect, it } from 'vitest'
import { clearIdempotencyKey, resolveIdempotencyKey } from './idempotency'

function store() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => { values.delete(key) }, values }
}

describe('resolveIdempotencyKey', () => {
  it('reuses a key only for the same scoped payload', () => {
    const memory = new Map<string, { key: string; fingerprint: string }>()
    const storage = store()
    let next = 0
    const createKey = () => 'key-' + ++next
    expect(resolveIdempotencyKey({ scope: 'movement:1:2', fingerprint: 'receipt-2', memory, storage, createKey })).toBe('key-1')
    expect(resolveIdempotencyKey({ scope: 'movement:1:2', fingerprint: 'receipt-2', memory, storage, createKey })).toBe('key-1')
    expect(resolveIdempotencyKey({ scope: 'movement:1:2', fingerprint: 'receipt-3', memory, storage, createKey })).toBe('key-2')
    expect(resolveIdempotencyKey({ scope: 'movement:1:3', fingerprint: 'receipt-3', memory, storage, createKey })).toBe('key-3')
  })

  it('clears a completed operation from memory and session storage', () => {
    const memory = new Map<string, { key: string; fingerprint: string }>()
    const storage = store()
    resolveIdempotencyKey({ scope: 'movement:1:2', fingerprint: 'receipt', memory, storage, createKey: () => 'key' })
    clearIdempotencyKey('movement:1:2', memory, storage)
    expect(memory.has('movement:1:2')).toBe(false)
    expect([...storage.values.keys()]).toHaveLength(0)
  })
})
