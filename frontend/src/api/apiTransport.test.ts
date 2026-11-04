import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './apiTransport'

describe('createApiClient', () => {
  it('sends Firebase bearer tokens without cookies and parses JSON', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"value":3}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    const client = createApiClient({ baseUrl: 'https://api.example.test/', getToken: async () => 'firebase-id-token', fetcher })

    await expect(client.request<{ value: number }>('/api/users/me')).resolves.toEqual({ value: 3 })
    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(request.headers)
    expect(url).toBe('https://api.example.test/api/users/me')
    expect(request.credentials).toBe('omit')
    expect(headers.get('Authorization')).toBe('Bearer firebase-id-token')
    expect(headers.get('Accept')).toBe('application/json')
  })

  it('normalizes backend validation errors with status and field details', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"code":"VALIDATION_ERROR","message":"Invalid request","errors":{"name":"Required"}}', {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }))
    const client = createApiClient({ baseUrl: 'https://api.example.test', getToken: async () => 'token', fetcher })

    await expect(client.request('/api/businesses')).rejects.toMatchObject({
      name: 'ApiError', status: 400, code: 'VALIDATION_ERROR', fieldErrors: { name: 'Required' },
    })
  })

  it('uses multipart bodies without forcing a JSON content type', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const client = createApiClient({ baseUrl: 'https://api.example.test', getToken: async () => 'token', fetcher })
    const body = new FormData()
    body.set('file', new Blob(['row']), 'data.csv')

    await client.request('/api/businesses/1/datasets', { method: 'POST', body })
    const request = fetcher.mock.calls[0]?.[1] as RequestInit
    const headers = new Headers(request.headers)
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('Authorization')).toBe('Bearer token')
    expect(headers.has('Content-Type')).toBe(false)
    expect(request.credentials).toBe('omit')
  })

  it('does not request a token for explicitly public calls', async () => {
    const getToken = vi.fn(async () => 'token')
    const fetcher = vi.fn().mockResolvedValue(new Response('{"available":true}', { status: 200 }))
    const client = createApiClient({ baseUrl: 'https://api.example.test', getToken, fetcher })

    await client.request('/api/users/check-username', { authenticated: false })
    expect(getToken).not.toHaveBeenCalled()
  })
})
