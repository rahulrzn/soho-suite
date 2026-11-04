import { apiDownload, apiRequest } from './client'
import type { DatasetDetail, DatasetMetadata, DatasetRowsPage } from './models'

export const listDatasets = (businessId: number) => apiRequest<DatasetMetadata[]>(`/api/businesses/${businessId}/datasets`)
export const getDataset = (businessId: number, datasetId: number) => apiRequest<DatasetDetail>(`/api/businesses/${businessId}/datasets/${datasetId}`)
export const getDatasetRows = (businessId: number, datasetId: number, page: number, size = 20) => apiRequest<DatasetRowsPage>(`/api/businesses/${businessId}/datasets/${datasetId}/rows?page=${page}&size=${size}`)
export const confirmDataset = (businessId: number, datasetId: number, columnNames: string[]) => apiRequest<DatasetDetail>(`/api/businesses/${businessId}/datasets/${datasetId}/confirm`, { method: 'POST', json: { columnNames } })
export const updateDataset = (businessId: number, datasetId: number, body: { name: string; description?: string }) => apiRequest<DatasetMetadata>(`/api/businesses/${businessId}/datasets/${datasetId}`, { method: 'PATCH', json: body })
export const deleteDataset = (businessId: number, datasetId: number) => apiRequest<void>(`/api/businesses/${businessId}/datasets/${datasetId}`, { method: 'DELETE' })

export async function uploadDataset(businessId: number, file: File, name: string, description: string, key: string) {
  const body = new FormData()
  body.set('file', file)
  if (name.trim()) body.set('name', name.trim())
  if (description.trim()) body.set('description', description.trim())
  return apiRequest<DatasetDetail>(`/api/businesses/${businessId}/datasets`, {
    method: 'POST', body, headers: { 'Idempotency-Key': key },
  })
}

export const exportDatasetRows = (businessId: number, datasetId: number) => apiDownload(`/api/businesses/${businessId}/exports/datasets/${datasetId}/rows`)
