import { apiRequest } from './client'
import type { AnalyticsOverview, HealthScore } from './models'

export type AnalyticsConfig = { datasetId: number; dateColumn: string; lineAmountColumn: string; orderIdColumn: string; customerIdColumn?: string; confirmedCurrency: string }
export type AnalyticsConfigResponse = AnalyticsConfig & { updatedAt: string }
export const configureAnalytics = (businessId: number, body: AnalyticsConfig) => apiRequest<AnalyticsConfigResponse>(`/api/businesses/${businessId}/analytics/dataset-config`, { method: 'PUT', json: body })
export const getAnalyticsOverview = (businessId: number, from: string, to: string) => apiRequest<AnalyticsOverview>(`/api/businesses/${businessId}/analytics/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
export const getHealthScore = (businessId: number, from: string, to: string) => apiRequest<HealthScore>(`/api/businesses/${businessId}/analytics/health-score?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
