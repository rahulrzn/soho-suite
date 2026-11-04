import { apiDownload, apiRequest } from './client'
import type { Expense, ExpenseCategory, ExpenseSummary, Page } from './models'

export type ExpenseInput = { expenseDate: string; amount: string; category: ExpenseCategory; description: string; reference?: string }
export type ExpenseFilters = { from?: string; to?: string; category?: ExpenseCategory; page?: number; size?: number }
function query(filters: ExpenseFilters) {
  const params = new URLSearchParams()
  for (const key of ['from', 'to', 'category', 'page', 'size'] as const) {
    const value = filters[key]
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.size ? `?${params}` : ''
}
export const listExpenses = (businessId: number, filters: ExpenseFilters = {}) => apiRequest<Page<Expense>>(`/api/businesses/${businessId}/expenses${query(filters)}`)
export const getExpenseSummary = (businessId: number, filters: Pick<ExpenseFilters, 'from' | 'to'> = {}) => apiRequest<ExpenseSummary>(`/api/businesses/${businessId}/expenses/summary${query(filters)}`)
export const createExpense = (businessId: number, body: ExpenseInput) => apiRequest<Expense>(`/api/businesses/${businessId}/expenses`, { method: 'POST', json: body })
export const updateExpense = (businessId: number, expenseId: number, body: ExpenseInput) => apiRequest<Expense>(`/api/businesses/${businessId}/expenses/${expenseId}`, { method: 'PUT', json: body })
export const deleteExpense = (businessId: number, expenseId: number) => apiRequest<void>(`/api/businesses/${businessId}/expenses/${expenseId}`, { method: 'DELETE' })
export const exportExpenses = (businessId: number, from?: string, to?: string) => apiDownload(`/api/businesses/${businessId}/exports/expenses${query({ from, to })}`)
export const exportExpenseSummary = (businessId: number, from?: string, to?: string) => apiDownload(`/api/businesses/${businessId}/exports/expenses/summary${query({ from, to })}`)
