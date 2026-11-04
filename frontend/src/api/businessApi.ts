import { apiRequest } from './client'
import type { Business, BusinessMember, BusinessRole } from './models'

export type BusinessUpsert = {
  company: string
  tradingName: string
  legalBusinessName?: string
  businessType?: string
  industry?: string
  legalStructure?: string
  businessEmail?: string
  businessCurrency?: string
  financialYearStartMonth?: number
  country?: string
  state?: string
  city?: string
  pincode?: string
}
export const listBusinesses = () => apiRequest<Business[]>('/api/businesses')
export const getBusiness = (id: number) => apiRequest<Business>(`/api/businesses/${id}`)
export const createBusiness = (body: BusinessUpsert) => apiRequest<Business>('/api/businesses', { method: 'POST', json: body })
export const updateBusiness = (id: number, body: BusinessUpsert) => apiRequest<Business>(`/api/businesses/${id}`, { method: 'PUT', json: body })
export const deleteBusiness = (id: number) => apiRequest<void>(`/api/businesses/${id}`, { method: 'DELETE' })
export const listMembers = (id: number) => apiRequest<BusinessMember[]>(`/api/businesses/${id}/members`)
export const addMember = (id: number, userId: number, role: BusinessRole) => apiRequest<BusinessMember>(`/api/businesses/${id}/members`, { method: 'POST', json: { userId, role } })
export const updateMemberRole = (id: number, userId: number, role: BusinessRole) => apiRequest<BusinessMember>(`/api/businesses/${id}/members/${userId}/role`, { method: 'PATCH', json: { role } })
export const removeMember = (id: number, userId: number) => apiRequest<void>(`/api/businesses/${id}/members/${userId}`, { method: 'DELETE' })
