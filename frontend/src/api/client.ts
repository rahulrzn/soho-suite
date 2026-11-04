import { getIdToken } from '../auth/authService'
import { resolveApiBaseUrl } from './apiConfig'
import { createApiClient, type ApiRequestOptions, type DownloadResult } from './apiTransport'

function configuredClient() {
  return createApiClient({
    baseUrl: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
    getToken: getIdToken,
  })
}

export function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return configuredClient().request<T>(path, options)
}

export function apiDownload(path: string, options: ApiRequestOptions = {}): Promise<DownloadResult> {
  return configuredClient().download(path, options)
}
