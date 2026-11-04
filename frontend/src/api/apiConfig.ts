export function resolveApiBaseUrl(value: string | undefined): string {
  const candidate = value?.trim()
  if (!candidate) {
    throw new Error('VITE_API_BASE_URL is required. Configure the backend base URL for this environment.')
  }

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid absolute HTTP(S) URL.')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must be a valid absolute HTTP(S) URL.')
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('VITE_API_BASE_URL must not contain credentials, a query string, or a fragment.')
  }

  return parsed.toString().replace(/\/+$/, '')
}
