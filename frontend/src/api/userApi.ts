import { apiRequest, getDefaultApiBaseUrl } from './apiClient'

export type CreateUserProfile = {
  username: string
  firstName: string
  lastName: string
  phone?: string
}

export async function createUserProfile(profile: CreateUserProfile): Promise<unknown> {
  const result = await apiRequest(getDefaultApiBaseUrl(), '/api/users/profile', {
    method: 'POST',
    body: profile,
  })

  if (result.status < 200 || result.status >= 300) {
    const responseBody = result.body as { message?: unknown; code?: unknown } | null
    const message = typeof responseBody?.message === 'string'
      ? responseBody.message
      : typeof responseBody?.code === 'string'
        ? responseBody.code
        : 'Failed to create user profile'
    throw new Error(message)
  }

  return result.body
}
