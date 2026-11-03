export type PendingUpload = {
  key: string
  fingerprint: string
}

export type UploadPayloadParts = {
  filename: string
  size: number
  lastModified: number
  name: string
  description: string
}

export type PendingUploadStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function pendingUploadStorageKey(businessId: number): string {
  return `sohosuite.pending-dataset-upload.${businessId}`
}

/** Client-side fingerprint used only to avoid reusing a key for a different payload. */
export function uploadPayloadFingerprint(parts: UploadPayloadParts): string {
  return [
    parts.filename,
    String(parts.size),
    String(parts.lastModified),
    parts.name.trim(),
    parts.description.trim(),
  ].join('\u0000')
}

export function parsePendingUpload(raw: string | null): PendingUpload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PendingUpload>
    if (typeof parsed.key === 'string' && parsed.key && typeof parsed.fingerprint === 'string') {
      return { key: parsed.key, fingerprint: parsed.fingerprint }
    }
  } catch {
    // Legacy format stored a bare UUID. Without a fingerprint it is unsafe to reuse
    // after a payload change, so treat it as absent.
  }
  return null
}

export function serializePendingUpload(pending: PendingUpload): string {
  return JSON.stringify(pending)
}

/**
 * Reuse the pending key only when the payload fingerprint matches.
 * Mint a new key when the payload differs or no pending entry exists.
 */
export function resolvePendingUploadKey(options: {
  businessId: number
  fingerprint: string
  memory: Map<number, PendingUpload>
  storage?: PendingUploadStore | null
  createKey?: () => string
}): string {
  const { businessId, fingerprint, memory, storage = null, createKey = () => crypto.randomUUID() } = options
  const storageKey = pendingUploadStorageKey(businessId)

  let stored: PendingUpload | null = memory.get(businessId) ?? null
  if (!stored && storage) {
    try {
      stored = parsePendingUpload(storage.getItem(storageKey))
    } catch {
      stored = null
    }
  }

  if (stored && stored.fingerprint === fingerprint) {
    memory.set(businessId, stored)
    return stored.key
  }

  const pending: PendingUpload = { key: createKey(), fingerprint }
  memory.set(businessId, pending)
  if (storage) {
    try {
      storage.setItem(storageKey, serializePendingUpload(pending))
    } catch {
      /* In-memory key still supports retries in this page. */
    }
  }
  return pending.key
}

export function clearPendingUploadKey(
  businessId: number,
  memory: Map<number, PendingUpload>,
  storage?: PendingUploadStore | null,
): void {
  memory.delete(businessId)
  if (!storage) return
  try {
    storage.removeItem(pendingUploadStorageKey(businessId))
  } catch {
    /* Ignore unavailable browser storage. */
  }
}

export function isIdempotencyConflict(status: number, body: { code?: string } | null | undefined): boolean {
  return status === 409 && body?.code === 'IDEMPOTENCY_CONFLICT'
}
