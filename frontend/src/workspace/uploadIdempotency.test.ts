import { describe, expect, it } from 'vitest'
import {
  clearPendingUploadKey,
  isIdempotencyConflict,
  parsePendingUpload,
  resolvePendingUploadKey,
  uploadPayloadFingerprint,
  type PendingUpload,
  type PendingUploadStore,
} from './uploadIdempotency'

function memoryStore(initial: Record<string, string> = {}): PendingUploadStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value
    },
    removeItem: (key) => {
      delete data[key]
    },
  }
}

const basePayload = {
  filename: 'sales.csv',
  size: 1200,
  lastModified: 1700000000000,
  name: 'Monthly sales',
  description: 'Q1',
}

describe('uploadPayloadFingerprint', () => {
  it('changes when name or file identity changes', () => {
    const a = uploadPayloadFingerprint(basePayload)
    const b = uploadPayloadFingerprint({ ...basePayload, name: 'Other' })
    const c = uploadPayloadFingerprint({ ...basePayload, size: 1201 })
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })
})

describe('resolvePendingUploadKey', () => {
  it('reuses a pending key for the same payload fingerprint', () => {
    const memory = new Map<number, PendingUpload>()
    const storage = memoryStore()
    const fingerprint = uploadPayloadFingerprint(basePayload)
    const first = resolvePendingUploadKey({
      businessId: 7,
      fingerprint,
      memory,
      storage,
      createKey: () => 'key-a',
    })
    const second = resolvePendingUploadKey({
      businessId: 7,
      fingerprint,
      memory,
      storage,
      createKey: () => 'key-b',
    })
    expect(first).toBe('key-a')
    expect(second).toBe('key-a')
  })

  it('mints a new key when the payload fingerprint differs', () => {
    const memory = new Map<number, PendingUpload>()
    const storage = memoryStore()
    const first = resolvePendingUploadKey({
      businessId: 7,
      fingerprint: uploadPayloadFingerprint(basePayload),
      memory,
      storage,
      createKey: () => 'key-a',
    })
    const second = resolvePendingUploadKey({
      businessId: 7,
      fingerprint: uploadPayloadFingerprint({ ...basePayload, description: 'changed' }),
      memory,
      storage,
      createKey: () => 'key-b',
    })
    expect(first).toBe('key-a')
    expect(second).toBe('key-b')
  })

  it('scopes pending keys by business id', () => {
    const memory = new Map<number, PendingUpload>()
    const fingerprint = uploadPayloadFingerprint(basePayload)
    const one = resolvePendingUploadKey({
      businessId: 1,
      fingerprint,
      memory,
      createKey: () => 'biz-1',
    })
    const two = resolvePendingUploadKey({
      businessId: 2,
      fingerprint,
      memory,
      createKey: () => 'biz-2',
    })
    expect(one).toBe('biz-1')
    expect(two).toBe('biz-2')
    expect(memory.get(1)?.key).toBe('biz-1')
    expect(memory.get(2)?.key).toBe('biz-2')
  })

  it('clears the pending key after success', () => {
    const memory = new Map<number, PendingUpload>()
    const storage = memoryStore()
    const fingerprint = uploadPayloadFingerprint(basePayload)
    resolvePendingUploadKey({
      businessId: 3,
      fingerprint,
      memory,
      storage,
      createKey: () => 'keep-me',
    })
    clearPendingUploadKey(3, memory, storage)
    expect(memory.has(3)).toBe(false)
    expect(storage.getItem('sohosuite.pending-dataset-upload.3')).toBeNull()
    const next = resolvePendingUploadKey({
      businessId: 3,
      fingerprint,
      memory,
      storage,
      createKey: () => 'fresh',
    })
    expect(next).toBe('fresh')
  })

  it('ignores legacy bare UUID values without a fingerprint', () => {
    const memory = new Map<number, PendingUpload>()
    const storage = memoryStore({
      'sohosuite.pending-dataset-upload.9': 'legacy-uuid-only',
    })
    expect(parsePendingUpload('legacy-uuid-only')).toBeNull()
    const key = resolvePendingUploadKey({
      businessId: 9,
      fingerprint: uploadPayloadFingerprint(basePayload),
      memory,
      storage,
      createKey: () => 'replacement',
    })
    expect(key).toBe('replacement')
  })
})

describe('isIdempotencyConflict', () => {
  it('detects the backend conflict code', () => {
    expect(isIdempotencyConflict(409, { code: 'IDEMPOTENCY_CONFLICT' })).toBe(true)
    expect(isIdempotencyConflict(409, { code: 'BUSINESS_CONFLICT' })).toBe(false)
    expect(isIdempotencyConflict(400, { code: 'IDEMPOTENCY_CONFLICT' })).toBe(false)
  })
})
