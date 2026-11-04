import type { PendingUploadStore } from './uploadIdempotency'

export type PendingOperation = { key: string; fingerprint: string }
export type OperationStore = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

function storageKey(scope: string) { return 'sohosuite.operation.' + encodeURIComponent(scope) }

function parse(value: string | null): PendingOperation | null {
  if (!value) return null
  try {
    const result = JSON.parse(value) as Partial<PendingOperation>
    if (typeof result.key === 'string' && result.key && typeof result.fingerprint === 'string') return { key: result.key, fingerprint: result.fingerprint }
  } catch { return null }
  return null
}

export function resolveIdempotencyKey(options: {
  scope: string
  fingerprint: string
  memory: Map<string, PendingOperation>
  storage?: OperationStore | PendingUploadStore | null
  createKey?: () => string
}): string {
  const { scope, fingerprint, memory, storage = null, createKey = () => crypto.randomUUID() } = options
  let pending = memory.get(scope) ?? null
  if (!pending && storage) {
    try { pending = parse(storage.getItem(storageKey(scope))) } catch { pending = null }
  }
  if (pending?.fingerprint === fingerprint) { memory.set(scope, pending); return pending.key }
  const next = { key: createKey(), fingerprint }
  memory.set(scope, next)
  if (storage) {
    try { storage.setItem(storageKey(scope), JSON.stringify(next)) } catch { /* The in-memory key still protects retries during this page session. */ }
  }
  return next.key
}

export function clearIdempotencyKey(scope: string, memory: Map<string, PendingOperation>, storage?: OperationStore | PendingUploadStore | null) {
  memory.delete(scope)
  if (storage) { try { storage.removeItem(storageKey(scope)) } catch { /* Storage is optional. */ } }
}
