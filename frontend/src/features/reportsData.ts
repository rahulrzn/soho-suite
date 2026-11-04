import type { InventoryItem, Page } from '../api/models'

export function isDateRangeValid(from: string, to: string): boolean {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  return Boolean(from && to) && Number.isFinite(start) && Number.isFinite(end) && end >= start
}

export function isAnalyticsDateRangeValid(from: string, to: string): boolean {
  if (!isDateRangeValid(from, to)) return false
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1
  return days <= 366
}

export async function loadAllInventoryItems(
  loadPage: (page: number, size: number) => Promise<Page<InventoryItem>>,
  pageSize = 100,
): Promise<InventoryItem[]> {
  const firstPage = await loadPage(0, pageSize)
  const pageCount = Math.ceil(firstPage.total / firstPage.size)
  if (pageCount <= 1) return firstPage.items
  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => loadPage(index + 1, pageSize)),
  )
  return [...firstPage.items, ...remaining.flatMap((page) => page.items)]
}
