import { apiDownload } from './client'

export const exportAnalytics = (businessId: number, from: string, to: string) => apiDownload(`/api/businesses/${businessId}/exports/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
