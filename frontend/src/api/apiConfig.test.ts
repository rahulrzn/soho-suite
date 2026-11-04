import { describe, expect, it } from 'vitest'
import { resolveApiBaseUrl } from './apiConfig'

describe('resolveApiBaseUrl', () => {
  it('requires a configured API base URL', () => {
    expect(() => resolveApiBaseUrl(undefined)).toThrow('VITE_API_BASE_URL is required')
    expect(() => resolveApiBaseUrl('   ')).toThrow('VITE_API_BASE_URL is required')
  })

  it('normalizes a configured URL without changing its origin', () => {
    expect(resolveApiBaseUrl(' https://api.example.test/ ')).toBe('https://api.example.test')
  })

  it('rejects malformed and non-http URLs', () => {
    expect(() => resolveApiBaseUrl('not a url')).toThrow('must be a valid absolute HTTP(S) URL')
    expect(() => resolveApiBaseUrl('ftp://api.example.test')).toThrow('must be a valid absolute HTTP(S) URL')
  })
})
