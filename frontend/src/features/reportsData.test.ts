import { describe, expect, it, vi } from 'vitest'
import type { InventoryItem, Page } from '../api/models'
import { isAnalyticsDateRangeValid, isDateRangeValid, loadAllInventoryItems } from './reportsData'

function item(id: number): InventoryItem {
  return { id, name: `Item ${id}`, sku: null, description: null, active: true, quantity: 1, createdAt: '', updatedAt: '' }
}

describe('loadAllInventoryItems', () => {
  it('loads every server page so item filtered exports include the full inventory', async () => {
    const loadPage = vi.fn(async (page: number, size: number): Promise<Page<InventoryItem>> => ({
      items: page === 0 ? [item(1), item(2)] : [item(3)], total: 3, page, size,
    }))

    await expect(loadAllInventoryItems(loadPage, 2)).resolves.toEqual([item(1), item(2), item(3)])
    expect(loadPage).toHaveBeenCalledTimes(2)
    expect(loadPage).toHaveBeenLastCalledWith(1, 2)
  })

  it('does not request another page for an empty inventory', async () => {
    const loadPage = vi.fn(async (page: number, size: number): Promise<Page<InventoryItem>> => ({ items: [], total: 0, page, size }))

    await expect(loadAllInventoryItems(loadPage, 100)).resolves.toEqual([])
    expect(loadPage).toHaveBeenCalledTimes(1)
  })
})

describe('report date ranges', () => {
  it('limits analytics ranges to 366 days and accepts shorter valid ranges', () => {
    expect(isAnalyticsDateRangeValid('2026-01-01', '2026-12-31')).toBe(true)
    expect(isAnalyticsDateRangeValid('2026-01-01', '2027-01-02')).toBe(false)
  })

  it('keeps expense export dates valid without applying the analytics range cap', () => {
    expect(isDateRangeValid('2026-01-01', '2027-01-01')).toBe(true)
    expect(isDateRangeValid('2026-03-02', '2026-03-01')).toBe(false)
    expect(isDateRangeValid('', '2026-03-01')).toBe(false)
  })
})
