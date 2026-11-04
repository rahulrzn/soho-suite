export type ApiFieldErrors = Record<string, string | string[]>

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: ApiFieldErrors
  readonly responseBody: unknown

  constructor(status: number, code: string, message: string, fieldErrors: ApiFieldErrors = {}, responseBody: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.responseBody = responseBody
  }
}

export type ApiRequestOptions = {
  method?: string
  body?: BodyInit | null
  json?: unknown
  headers?: HeadersInit
  authenticated?: boolean
  signal?: AbortSignal
}

export type ApiClientOptions = {
  baseUrl: string
  getToken: () => Promise<string>
  fetcher?: typeof fetch
}

export type DownloadResult = { blob: Blob; filename: string | null }

type ErrorPayload = { code?: unknown; message?: unknown; errors?: unknown }

function fieldErrorsFrom(value: unknown): ApiFieldErrors {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).flatMap(([key, nested]) => {
    if (typeof nested === 'string' || (Array.isArray(nested) && nested.every((part) => typeof part === 'string'))) {
      return [[key, nested as string | string[]]]
    }
    return []
  }))
}

function messageFrom(payload: unknown, status: number): { code: string; message: string; fieldErrors: ApiFieldErrors } {
  const error = payload && typeof payload === 'object' ? payload as ErrorPayload : {}
  const code = typeof error.code === 'string' ? error.code : `HTTP_${status}`
  const message = typeof error.message === 'string' && error.message.trim()
    ? error.message
    : `The request failed with HTTP ${status}.`
  return { code, message, fieldErrors: fieldErrorsFrom(error.errors) }
}

function requestUrl(baseUrl: string, path: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) {
    throw new Error('API requests must use a path on the configured backend.')
  }
  const base = baseUrl.replace(/\/+$/, '')
  return `${base}/${path.replace(/^\/+/, '')}`
}

async function readResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return null
  const text = await response.text()
  if (!text) return null
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('json')) {
    try { return JSON.parse(text) as unknown } catch { return text }
  }
  return text
}

function filenameFromDisposition(value: string | null): string | null {
  if (!value) return null
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1]
  if (encoded) {
    try { return decodeURIComponent(encoded.replace(/^"|"$/g, '')) } catch { return encoded }
  }
  const regular = /filename="?([^";]+)"?/i.exec(value)?.[1]
  return regular?.trim() || null
}

export function createApiClient({ baseUrl, getToken, fetcher = fetch }: ApiClientOptions) {
  async function send(path: string, options: ApiRequestOptions = {}): Promise<Response> {
    const headers = new Headers(options.headers)
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')

    let body = options.body
    if (options.json !== undefined) {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(options.json)
    } else if (body && !(body instanceof FormData) && typeof body === 'object' && !(body instanceof Blob)) {
      throw new Error('Use json for JSON request bodies; raw object bodies are not supported.')
    }

    if (options.authenticated !== false) {
      headers.set('Authorization', `Bearer ${await getToken()}`)
    }

    return fetcher(requestUrl(baseUrl, path), {
      method: options.method ?? 'GET',
      headers,
      credentials: 'omit',
      body,
      signal: options.signal,
    })
  }

  return {
    async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
      const response = await send(path, options)
      const payload = await readResponse(response)
      if (!response.ok) {
        const error = messageFrom(payload, response.status)
        throw new ApiError(response.status, error.code, error.message, error.fieldErrors, payload)
      }
      return payload as T
    },

    async download(path: string, options: ApiRequestOptions = {}): Promise<DownloadResult> {
      const response = await send(path, { ...options, headers: { Accept: 'text/csv', ...Object.fromEntries(new Headers(options.headers).entries()) } })
      if (!response.ok) {
        const payload = await readResponse(response)
        const error = messageFrom(payload, response.status)
        throw new ApiError(response.status, error.code, error.message, error.fieldErrors, payload)
      }
      return { blob: await response.blob(), filename: filenameFromDisposition(response.headers.get('content-disposition')) }
    },
  }
}
