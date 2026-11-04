import { getIdToken } from '../auth/authService'
import { resolveApiBaseUrl } from './apiConfig'

export type ApiRequestOptions = {
  method?: string
  body?: unknown
  authenticated?: boolean
}

export type ApiResult = {
  method: string
  url: string
  status: number
  durationMs: number
  body: unknown
  requestBody?: unknown
  headers: Record<string, string>
}

export function getDefaultApiBaseUrl(): string {
  return resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
}

export async function apiRequest(
  baseUrl: string,
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.authenticated !== false) {
    headers.Accept = 'application/json'
    const token = await getIdToken()
    headers.Authorization = `Bearer ${token}`
  }

  const configuredBaseUrl = resolveApiBaseUrl(baseUrl)
  const url = `${configuredBaseUrl}/${path.replace(/^\/+/, '')}`
  const startedAt = performance.now()
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      mode: 'cors',
      // The API is stateless and uses Firebase bearer tokens. Never let browser cookies
      // silently authenticate the "no token" check (or any other API request).
      credentials: 'omit',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (error) {
    throw new ApiNetworkError(url, error)
  }

  const responseText = await response.text()
  let body: unknown = null
  if (responseText) {
    try {
      body = JSON.parse(responseText) as unknown
    } catch {
      body = responseText
    }
  }

  return {
    method,
    url,
    status: response.status,
    durationMs: Math.round(performance.now() - startedAt),
    body: redactSensitiveValues(body),
    requestBody: redactSensitiveValues(options.body),
    headers: { ...headers, ...(headers.Authorization ? { Authorization: 'Bearer [REDACTED]' } : {}) },
  }
}

export class ApiNetworkError extends Error {
  readonly url: string

  constructor(url: string, cause: unknown) {
    const message = cause instanceof Error ? cause.message : ''
    super(
      message && message !== 'Failed to fetch'
        ? message
        : 'The browser could not read an HTTP response. Check that the backend is reachable and that CORS_ALLOWED_ORIGINS includes this frontend origin; see the browser Network and Console panels for details.',
    )
    this.name = 'ApiNetworkError'
    this.url = url
  }
}

export function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveValues)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [
      key,
      /authorization|token|password|secret|private.?key|credential|email|phone|uid/i.test(key)
        ? '[REDACTED]'
        : redactSensitiveValues(nested),
    ]))
  }
  return value
}
