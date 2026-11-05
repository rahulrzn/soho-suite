import type { Expense, Page, SalesTrendPoint } from '../api/models'
import type { TrendPoint } from '../soho/types'

export type DashboardPreset = '7D' | '30D' | 'QTD' | 'YTD'
export type DateRange = { from: string; to: string }

export function getDashboardDateRange(preset: DashboardPreset, today = new Date()): DateRange {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(end)
  if (preset === '7D') start.setDate(start.getDate() - 6)
  else if (preset === '30D') start.setDate(start.getDate() - 29)
  else if (preset === 'QTD') start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1)
  else start.setMonth(0, 1)
  return { from: localDate(start), to: localDate(end) }
}

export function getTrailingYearRange(today = new Date()): DateRange {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(end.getFullYear(), end.getMonth() - 11, 1)
  return { from: localDate(start), to: localDate(end) }
}

export function buildMonthlyPerformance(
  sales: SalesTrendPoint[] | null,
  expenses: Expense[],
  currency: string | null,
  from: string,
  to: string,
): TrendPoint[] {
  const start = parseDate(from)
  const end = parseDate(to)
  if (!start || !end || start > end) return []

  const months: { key: string; point: TrendPoint }[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= lastMonth) {
    months.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      point: { label: new Intl.DateTimeFormat('en', { month: 'short' }).format(cursor), revenue: sales ? 0 : null, expenses: 0 },
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  const indexed = new Map(months.map((month) => [month.key, month.point]))

  for (const item of sales ?? []) {
    const date = parseDate(item.date)
    if (!date || date < start || date > end) continue
    const point = indexed.get(monthKey(date))
    if (point && typeof point.revenue === 'number') point.revenue += item.salesAmount
  }
  for (const expense of expenses) {
    if (!currency || expense.currency !== currency) continue
    const date = parseDate(expense.expenseDate)
    if (!date || date < start || date > end) continue
    const point = indexed.get(monthKey(date))
    if (point && typeof point.expenses === 'number') point.expenses += expense.amount
  }
  return months.map(({ point }) => point)
}

/** Build a chart over exactly the selected range, choosing buckets that stay legible. */
export function buildDashboardPerformance(
  sales: SalesTrendPoint[] | null,
  expenses: Expense[],
  currency: string | null,
  from: string,
  to: string,
): TrendPoint[] {
  const start = parseDate(from)
  const end = parseDate(to)
  if (!start || !end || start > end) return []

  const dayCount = Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000) + 1
  const granularity = dayCount <= 31 ? 'day' : dayCount <= 120 ? 'week' : 'month'
  const bucketDates: Date[] = []
  if (granularity === 'month') {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)
    while (cursor <= last) {
      bucketDates.push(new Date(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }
  } else {
    const bucketSize = granularity === 'day' ? 1 : 7
    for (let offset = 0; offset < dayCount; offset += bucketSize) {
      const date = new Date(start)
      date.setDate(date.getDate() + offset)
      bucketDates.push(date)
    }
  }

  const points = bucketDates.map((date, index) => {
    const bucketEnd = new Date(date)
    bucketEnd.setDate(bucketEnd.getDate() + (granularity === 'day' ? 0 : granularity === 'week' ? 6 : daysInMonth(date) - 1))
    return {
      key: granularity === 'month' ? monthKey(date) : String(index),
      start: date,
      end: bucketEnd > end ? end : bucketEnd,
      point: {
      label: granularity === 'month'
        ? new Intl.DateTimeFormat('en', { month: 'short', ...(start.getFullYear() !== end.getFullYear() ? { year: '2-digit' } : {}) }).format(date)
        : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date),
      revenue: sales ? 0 : null,
      expenses: 0,
      } as TrendPoint,
    }
  })

  for (const item of sales ?? []) {
    const date = parseDate(item.date)
    if (!date || date < start || date > end) continue
    const bucket = points.find((candidate) => date >= candidate.start && date <= candidate.end)
    if (bucket && typeof bucket.point.revenue === 'number') bucket.point.revenue += item.salesAmount
  }
  for (const expense of expenses) {
    if (!currency || expense.currency !== currency) continue
    const date = parseDate(expense.expenseDate)
    if (!date || date < start || date > end) continue
    const bucket = points.find((candidate) => date >= candidate.start && date <= candidate.end)
    if (bucket && typeof bucket.point.expenses === 'number') bucket.point.expenses += expense.amount
  }
  return points.map(({ point }) => point)
}

export async function loadAllExpenses(
  loadPage: (page: number, size: number, from: string, to: string) => Promise<Page<Expense>>,
  from: string,
  to: string,
  pageSize = 100,
): Promise<Expense[]> {
  const firstPage = await loadPage(0, pageSize, from, to)
  const pageCount = Math.ceil(firstPage.total / firstPage.size)
  if (pageCount <= 1) return firstPage.items
  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => loadPage(index + 1, pageSize, from, to)),
  )
  return [...firstPage.items, ...remaining.flatMap((page) => page.items)]
}

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) ? date : null
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}
