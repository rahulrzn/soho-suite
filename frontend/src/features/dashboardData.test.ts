import { describe, expect, it, vi } from 'vitest'
import type { Expense, Page, SalesTrendPoint } from '../api/models'
import { buildMonthlyPerformance, getDashboardDateRange, getTrailingYearRange, loadAllExpenses } from './dashboardData'

const today = new Date(2026, 10, 4, 12)

function expense(id: number, expenseDate: string, amount: number, currency = 'INR'): Expense {
  return { id, expenseDate, amount, currency, category: 'SUPPLIES', description: 'Stock', reference: null, createdBy: 1, createdAt: '', updatedAt: '' }
}

describe('dashboard date ranges', () => {
  it('calculates the 7 day, 30 day, quarter, and year presets inclusively', () => {
    expect(getDashboardDateRange('7D', today)).toEqual({ from: '2026-10-29', to: '2026-11-04' })
    expect(getDashboardDateRange('30D', today)).toEqual({ from: '2026-10-06', to: '2026-11-04' })
    expect(getDashboardDateRange('QTD', today)).toEqual({ from: '2026-10-01', to: '2026-11-04' })
    expect(getDashboardDateRange('YTD', today)).toEqual({ from: '2026-01-01', to: '2026-11-04' })
  })

  it('starts the performance chart at the first day of the month eleven months earlier', () => {
    expect(getTrailingYearRange(today)).toEqual({ from: '2025-12-01', to: '2026-11-04' })
  })
})

describe('buildMonthlyPerformance', () => {
  it('aggregates real sales and same-currency expense rows into monthly chart points', () => {
    const sales: SalesTrendPoint[] = [
      { date: '2025-12-10', salesAmount: 120 },
      { date: '2026-01-10', salesAmount: 200 },
      { date: '2026-01-22', salesAmount: 50 },
      { date: '2026-02-03', salesAmount: 80 },
    ]
    const expenses = [expense(1, '2026-01-04', 40), expense(2, '2026-01-19', 15), expense(3, '2026-01-20', 700, 'USD')]

    expect(buildMonthlyPerformance(sales, expenses, 'INR', '2025-12-01', '2026-02-28')).toEqual([
      { label: 'Dec', revenue: 120, expenses: 0 },
      { label: 'Jan', revenue: 250, expenses: 55 },
      { label: 'Feb', revenue: 80, expenses: 0 },
    ])
  })

  it('does not turn incomplete sales data into zero revenue', () => {
    expect(buildMonthlyPerformance(null, [expense(1, '2026-01-04', 40)], 'INR', '2026-01-01', '2026-01-31'))
      .toEqual([{ label: 'Jan', revenue: null, expenses: 40 }])
  })
})

describe('loadAllExpenses', () => {
  it('loads all pages of real expense rows for a date range', async () => {
    const loadPage = vi.fn(async (page: number, size: number): Promise<Page<Expense>> => ({
      items: page === 0 ? [expense(1, '2026-01-01', 10)] : [expense(2, '2026-01-02', 20)], total: 2, page, size,
    }))
    await expect(loadAllExpenses(loadPage, '2026-01-01', '2026-01-31', 1)).resolves.toHaveLength(2)
    expect(loadPage).toHaveBeenCalledWith(1, 1, '2026-01-01', '2026-01-31')
  })
})
