import { apiDownload, apiRequest } from './client'
import type { InventoryItem, InventoryMovement, InventoryMovementType, Page } from './models'

export type InventoryInput = { name: string; sku?: string; description?: string; openingQuantity?: string }
export type InventoryUpdate = { name: string; sku?: string; description?: string; active: boolean }
export type MovementInput = { type: InventoryMovementType; quantity: string; reason: string }
export const listInventory = (businessId: number, page = 0, size = 20, active?: boolean) => {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (active !== undefined) params.set('active', String(active))
  return apiRequest<Page<InventoryItem>>(`/api/businesses/${businessId}/inventory/items?${params}`)
}
export const getInventoryItem = (businessId: number, itemId: number) => apiRequest<InventoryItem>(`/api/businesses/${businessId}/inventory/items/${itemId}`)
export const createInventoryItem = (businessId: number, body: InventoryInput) => apiRequest<InventoryItem>(`/api/businesses/${businessId}/inventory/items`, { method: 'POST', json: body })
export const updateInventoryItem = (businessId: number, itemId: number, body: InventoryUpdate) => apiRequest<InventoryItem>(`/api/businesses/${businessId}/inventory/items/${itemId}`, { method: 'PATCH', json: body })
export const addInventoryMovement = (businessId: number, itemId: number, body: MovementInput, idempotencyKey: string) => apiRequest<InventoryMovement>(`/api/businesses/${businessId}/inventory/items/${itemId}/movements`, { method: 'POST', json: body, headers: { 'Idempotency-Key': idempotencyKey } })
export const getInventoryMovements = (businessId: number, itemId: number, page = 0, size = 20) => apiRequest<Page<InventoryMovement>>(`/api/businesses/${businessId}/inventory/items/${itemId}/movements?page=${page}&size=${size}`)
export const exportInventory = (businessId: number) => apiDownload(`/api/businesses/${businessId}/exports/inventory`)
export const exportInventoryMovements = (businessId: number, itemId?: number) => apiDownload(`/api/businesses/${businessId}/exports/inventory/movements${itemId ? `?itemId=${itemId}` : ''}`)
