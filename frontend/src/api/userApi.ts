import { apiRequest } from './client'
import type { UserProfile } from './models'

export type CreateProfile = { username: string; firstName: string; lastName: string; phone?: string }
export type UpdateProfile = Partial<Pick<CreateProfile, 'firstName' | 'lastName' | 'phone'>>

export const getMyProfile = () => apiRequest<UserProfile>('/api/users/me')
export const createProfile = (body: CreateProfile) => apiRequest<UserProfile>('/api/users/profile', { method: 'POST', json: body })
export const updateProfile = (body: UpdateProfile) => apiRequest<UserProfile>('/api/users/me/profile', { method: 'PATCH', json: body })
export const checkUsername = (username: string) => apiRequest<{ available: boolean }>(`/api/users/check-username?username=${encodeURIComponent(username)}`)
