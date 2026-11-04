import { apiRequest } from './client'
import type { ActivityEvent, Page } from './models'

export const getActivity = (businessId: number, page: number, size = 20) => apiRequest<Page<ActivityEvent>>(`/api/businesses/${businessId}/activity?page=${page}&size=${size}`)
