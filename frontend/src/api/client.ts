import { getIdToken } from '../auth/authService'
import { getDefaultApiBaseUrl } from './apiClient'
import { createApiClient, type ApiRequestOptions, type DownloadResult } from './apiTransport'

function configuredClient() {
  return createApiClient({
    baseUrl: getDefaultApiBaseUrl(),
    getToken: getIdToken,
  })
}

export function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return configuredClient().request<T>(path, options)
}

export function apiDownload(path: string, options: ApiRequestOptions = {}): Promise<DownloadResult> {
  return configuredClient().download(path, options)
}
