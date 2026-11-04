import { apiRequest } from './client'
import type { BusinessRole, Invitation, OwnershipTransfer } from './models'

export const listInvitations = (businessId: number) => apiRequest<Invitation[]>(`/api/businesses/${businessId}/invitations`)
export const createInvitation = (businessId: number, email: string, role: Extract<BusinessRole, 'MANAGER' | 'VIEWER'>) => apiRequest<Invitation>(`/api/businesses/${businessId}/invitations`, { method: 'POST', json: { email, role } })
export const resendInvitation = (businessId: number, invitationId: number) => apiRequest<Invitation>(`/api/businesses/${businessId}/invitations/${invitationId}/resend`, { method: 'POST' })
export const revokeInvitation = (businessId: number, invitationId: number) => apiRequest<void>(`/api/businesses/${businessId}/invitations/${invitationId}`, { method: 'DELETE' })
export const acceptInvitation = (token: string) => apiRequest<void>('/api/invitations/accept', { method: 'POST', json: { token } })

export const requestOwnershipTransfer = (businessId: number, newOwnerUserId: number) => apiRequest<OwnershipTransfer>(`/api/businesses/${businessId}/ownership-transfers`, { method: 'POST', json: { newOwnerUserId } })
export const revokeOwnershipTransfer = (businessId: number, transferId: number) => apiRequest<void>(`/api/businesses/${businessId}/ownership-transfers/${transferId}`, { method: 'DELETE' })
export const acceptOwnershipTransfer = (token: string) => apiRequest<void>('/api/ownership-transfers/accept', { method: 'POST', json: { token } })
