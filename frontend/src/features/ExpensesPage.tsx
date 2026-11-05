/* eslint-disable react-hooks/set-state-in-effect -- The effect loads filtered expenses and their summary. */
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Calendar,
  Coins,
  Download,
  FileText,
  Filter,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Tag,
  Trash2,
} from 'lucide-react'
import {
  createExpense,
  deleteExpense,
  exportExpenseSummary,
  exportExpenses,
  getExpenseSummary,
  listExpenses,
  updateExpense,
} from '../api/expenseApi'
import { formatApiError } from '../api/formatError'
import type { Expense, ExpenseCategory, ExpenseSummary } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { ConfirmDialog, Modal } from '../components/Modal'
import { LoadingLine, Message } from '../components/Feedback'
import { EmptyState } from '../soho/components/states'
import type { PageCallbacks } from './types'
import { saveCsvDownload } from '../utils/download'
import { Copyable, PageHeader, Stat, StatStrip } from '../soho/components/misc'
import { Button } from '../soho/components/button'
import { Panel, PanelBody, PanelHeader } from '../soho/components/panel'
import { cn } from '../lib/utils'

const categories: ExpenseCategory[] = [
  'RENT',
  'UTILITIES',
  'PAYROLL',
  'MARKETING',
  'SUPPLIES',
  'TRANSPORT',
  'PROFESSIONAL_SERVICES',
  'MAINTENANCE',
  'OTHER',
]

const categoryTones: Record<ExpenseCategory, { badge: string; bar: string }> = {
  RENT: { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', bar: 'bg-emerald-500' },
  UTILITIES: { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', bar: 'bg-amber-500' },
  PAYROLL: { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30', bar: 'bg-blue-500' },
  MARKETING: { badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30', bar: 'bg-pink-500' },
  SUPPLIES: { badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30', bar: 'bg-purple-500' },
  TRANSPORT: { badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30', bar: 'bg-sky-500' },
  PROFESSIONAL_SERVICES: { badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', bar: 'bg-indigo-500' },
  MAINTENANCE: { badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', bar: 'bg-orange-500' },
  OTHER: { badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30', bar: 'bg-slate-500' },
}

const size = 20
type Filters = { from: string; to: string; category: string }

export function ExpensesPage({ onError, onNotice }: PageCallbacks) {
  const { business, role } = useWorkspace()
  const [filters, setFilters] = useState<Filters>({ from: '', to: '', category: '' })
  const [applied, setApplied] = useState<Filters>(filters)
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Expense | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState<'expenses' | 'summary' | null>(null)
  const downloadBusy = downloading !== null
  const editable = role === 'OWNER' || role === 'MANAGER'

  const load = useCallback(async () => {
    if (!validExpenseRange(applied.from, applied.to)) {
      onError('Expense date filters can cover at most 367 inclusive days.')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [result, totals] = await Promise.all([
        listExpenses(business.id, {
          from: applied.from || undefined,
          to: applied.to || undefined,
          category: (applied.category || undefined) as ExpenseCategory | undefined,
          page,
          size,
        }),
        getExpenseSummary(business.id, {
          from: applied.from || undefined,
          to: applied.to || undefined,
        }),
      ])
      setItems(result.items)
      setTotal(result.total)
      setSummary(totals)
    } catch (error) {
      onError(messageOf(error))
    } finally {
      setLoading(false)
    }
  }, [business.id, applied, page, onError])

  useEffect(() => {
    void load()
  }, [load])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editable || busy) return
    const form = new FormData(event.currentTarget)
    const body = {
      expenseDate: String(form.get('expenseDate')),
      amount: String(form.get('amount')).trim(),
      category: String(form.get('category')) as ExpenseCategory,
      description: String(form.get('description')).trim(),
      reference: String(form.get('reference')).trim() || undefined,
    }
    if (!/^\d{1,15}(\.\d{1,4})?$/.test(body.amount) || Number(body.amount) <= 0) {
      onError('Enter a positive amount with up to 15 integer digits and 4 decimal places.')
      return
    }
    setBusy(true)
    onError('')
    try {
      if (modal === 'edit' && selected) await updateExpense(business.id, selected.id, body)
      else await createExpense(business.id, body)
      setModal(null)
      setSelected(null)
      onNotice(modal === 'edit' ? 'Expense updated.' : 'Expense recorded.')
      await load()
    } catch (error) {
      onError(messageOf(error))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!selected) return
    setBusy(true)
    try {
      await deleteExpense(business.id, selected.id)
      setModal(null)
      setSelected(null)
      onNotice('Expense deleted.')
      await load()
    } catch (error) {
      onError(messageOf(error))
    } finally {
      setBusy(false)
    }
  }

  async function download(kind: 'expenses' | 'summary') {
    if (downloadBusy) return
    setDownloading(kind)
    try {
      const result =
        kind === 'expenses'
          ? await exportExpenses(business.id, applied.from || undefined, applied.to || undefined)
          : await exportExpenseSummary(business.id, applied.from || undefined, applied.to || undefined)
      saveCsvDownload(result, 'soho-expenses-' + kind + '.csv')
      onNotice('CSV download started.')
    } catch (error) {
      onError(messageOf(error))
    } finally {
      setDownloading(null)
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(0)
    setApplied(filters)
  }

  // Statistical aggregates
  const primaryCurrency = business.businessCurrency || summary?.currencies[0]?.currency || 'USD'
  const primarySummary =
    summary?.currencies.find((c) => c.currency === primaryCurrency) ?? summary?.currencies[0]
  const totalSpending = primarySummary?.total ?? 0
  const sortedCategories = primarySummary?.categories
    ? [...primarySummary.categories].sort((a, b) => b.total - a.total)
    : []
  const topCategory = sortedCategories[0] ?? null
  const topCategoryName = topCategory ? label(topCategory.category) : '—'
  const topCategoryAmount = topCategory?.total ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operating expenses"
        title="Expense register"
        description="Track and analyze operational spending across categories, vendors, and fiscal periods."
        actions={
          editable && (
            <Button
              variant="primary"
              onClick={() => {
                setSelected(null)
                setModal('create')
              }}
            >
              <Plus className="size-4" /> Add expense
            </Button>
          )
        }
      />

      {!editable && (
        <Message
          variant="warning"
          text="Your role can view expenses. An owner or manager can create, edit, or delete them."
        />
      )}

      {/* Top High-Contrast Stat Strip */}
      <StatStrip>
        <Stat
          icon={<Receipt />}
          tone="primary"
          label="Total spending"
          value={money(totalSpending, primaryCurrency, { cents: totalSpending < 10_000 && !Number.isInteger(totalSpending) })}
          hint="Operating period costs"
        />
        <Stat
          icon={<FileText />}
          tone="info"
          label="Recorded items"
          value={total.toLocaleString()}
          hint="Logged transactions"
        />
        <Stat
          icon={<Tag />}
          tone="purple"
          label="Top category"
          value={topCategoryName}
          hint={topCategory ? money(topCategoryAmount, primaryCurrency, { cents: topCategoryAmount < 10_000 && !Number.isInteger(topCategoryAmount) }) : 'No expenses recorded'}
        />
        <Stat
          icon={<Coins />}
          tone="success"
          label="Ledger currency"
          value={primaryCurrency}
          hint="Operating business currency"
        />
      </StatStrip>

      {/* Two-Panel Overview: Category Breakdown & Export Card */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Category Breakdown Panel */}
        <Panel className="lg:col-span-8">
          <PanelHeader
            eyebrow="Category breakdown"
            title="Spending by department"
            description="Operational costs organized by budget category."
          />
          <PanelBody>
            {sortedCategories.length ? (
              <div className="space-y-3.5">
                {sortedCategories.map((entry) => {
                  const pct = totalSpending > 0 ? (entry.total / totalSpending) * 100 : 0
                  const tone = categoryTones[entry.category] ?? categoryTones.OTHER
                  return (
                    <div key={entry.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md px-2 py-0.5 font-semibold text-[11px] border',
                              tone.badge,
                            )}
                          >
                            {label(entry.category)}
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <span className="font-mono font-bold text-foreground text-sm">
                          {money(entry.total, primaryCurrency)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface-sunken overflow-hidden border border-border/40">
                        <div
                          className={cn('h-full rounded-full transition-all duration-300', tone.bar)}
                          style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No expense categories recorded for this period.
              </div>
            )}
          </PanelBody>
        </Panel>

        {/* Currency & Exports Panel */}
        <Panel className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <PanelHeader
              eyebrow="Currency total"
              title={primaryCurrency}
              description="Primary ledger summary"
            />
            <PanelBody className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total in {primaryCurrency}
                </span>
                <p className="mt-1 max-w-full whitespace-nowrap font-mono text-[clamp(1rem,1.5vw,1.25rem)] font-bold tracking-tight text-foreground">
                  {money(totalSpending, primaryCurrency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sortedCategories.length} active budget categories
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  CSV Data Exports
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    className="w-full justify-center"
                    disabled={downloadBusy}
                    onClick={() => void download('expenses')}
                  >
                    <Download className="size-4" /> Download Expenses CSV
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center"
                    disabled={downloadBusy}
                    onClick={() => void download('summary')}
                  >
                    <Download className="size-4" /> Download Summary CSV
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
                  Exports honor the selected date range for bookkeeping audits and accounting reconciliations.
                </p>
              </div>
            </PanelBody>
          </div>
        </Panel>
      </div>

      {/* Main Expense Register Table */}
      <Panel>
        <PanelHeader
          eyebrow="Transaction ledger"
          title="Expense entries"
          description={`${total.toLocaleString()} transactions recorded`}
          actions={
            <form
              onSubmit={applyFilters}
              className="flex flex-wrap items-center gap-2 text-xs"
            >
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-sunken px-2.5 py-1">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">From:</span>
                <input
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(e) => setFilters((v) => ({ ...v, from: e.target.value }))}
                  className="bg-transparent font-mono text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-sunken px-2.5 py-1">
                <span className="text-muted-foreground">To:</span>
                <input
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(e) => setFilters((v) => ({ ...v, to: e.target.value }))}
                  className="bg-transparent font-mono text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-sunken px-2 py-1">
                <Filter className="size-3.5 text-muted-foreground" />
                <select
                  value={filters.category}
                  onChange={(e) => setFilters((v) => ({ ...v, category: e.target.value }))}
                  className="bg-transparent text-xs text-foreground focus:outline-none"
                >
                  <option value="" className="bg-surface text-foreground">
                    All categories
                  </option>
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-surface text-foreground">
                      {label(c)}
                    </option>
                  ))}
                </select>
              </div>

              <Button size="sm" variant="secondary" type="submit">
                Apply
              </Button>
              {(filters.from || filters.to || filters.category) && (
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    const empty = { from: '', to: '', category: '' }
                    setFilters(empty)
                    setApplied(empty)
                    setPage(0)
                  }}
                >
                  <RotateCcw className="size-3.5" /> Clear
                </Button>
              )}
            </form>
          }
        />

        {loading ? (
          <div className="p-8">
            <LoadingLine text="Loading expense records…" />
          </div>
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-sunken/60">
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                    Date
                  </th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider">
                    Category
                  </th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-right font-mono">
                    Amount
                  </th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                    Reference
                  </th>
                  <th className="py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((expense) => {
                  const tone = categoryTones[expense.category] ?? categoryTones.OTHER
                  return (
                    <tr
                      key={expense.id}
                      className="hover:bg-surface-sunken/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(expense.expenseDate + 'T00:00:00').toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <strong className="font-semibold text-foreground text-sm block">
                          {expense.description}
                        </strong>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold border',
                            tone.badge,
                          )}
                        >
                          {label(expense.category)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground text-sm whitespace-nowrap">
                        {money(expense.amount, expense.currency)}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground text-xs whitespace-nowrap">
                        {expense.reference ? (
                          <Copyable text={expense.reference}>{expense.reference}</Copyable>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {editable ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelected(expense)
                                setModal('edit')
                              }}
                              aria-label={`Edit ${expense.description}`}
                            >
                              <Pencil className="size-3.5" /> Edit
                            </Button>
                            <Button
                              variant="danger-ghost"
                              size="sm"
                              onClick={() => {
                                setSelected(expense)
                                setModal('delete')
                              }}
                              aria-label={`Delete ${expense.description}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={<Receipt />}
              title="No expenses found"
              description="Try adjusting your filters or record an operational cost for this business."
              action={
                editable ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setSelected(null)
                      setModal('create')
                    }}
                  >
                    <Plus className="size-4" /> Add expense
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span>
            {total.toLocaleString()} total entries · Page {page + 1} of{' '}
            {Math.max(1, Math.ceil(total / size))}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || page === 0}
              onClick={() => setPage((v) => Math.max(0, v - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading || (page + 1) * size >= total}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Panel>

      {(modal === 'create' || modal === 'edit') && (
        <ExpenseFormModal
          key={modal + '-' + selected?.id}
          mode={modal}
          expense={selected}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={save}
        />
      )}
      {modal === 'delete' && selected && (
        <ConfirmDialog
          title="Delete this expense?"
          description="The expense will be permanently removed from this business and its activity log will record the change."
          confirmLabel="Delete expense"
          destructive
          busy={busy}
          onCancel={() => setModal(null)}
          onConfirm={() => void remove()}
        />
      )}
    </div>
  )
}

function ExpenseFormModal({
  mode,
  expense,
  busy,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  expense: Expense | null
  busy: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Modal
      title={mode === 'edit' ? 'Edit expense' : 'Record an expense'}
      description="Enter amounts in the business currency. The backend validates date and decimal precision."
      onClose={onClose}
    >
      <form className="field-stack" onSubmit={(event) => onSubmit(event)}>
        <label>
          Date
          <input
            type="date"
            name="expenseDate"
            defaultValue={expense?.expenseDate ?? today()}
            required
          />
        </label>
        <label>
          Amount
          <input
            name="amount"
            inputMode="decimal"
            pattern="\d{1,15}(\.\d{1,4})?"
            placeholder="0.00"
            defaultValue={expense ? String(expense.amount) : ''}
            required
          />
        </label>
        <label>
          Category
          <select name="category" defaultValue={expense?.category ?? 'OTHER'} required>
            {categories.map((item) => (
              <option value={item} key={item}>
                {label(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description
          <input
            name="description"
            maxLength={240}
            defaultValue={expense?.description ?? ''}
            required
          />
        </label>
        <label>
          Reference <span className="optional-label">Optional</span>
          <input
            name="reference"
            maxLength={100}
            defaultValue={expense?.reference ?? ''}
          />
        </label>
        <div className="modal-actions">
          <button className="button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button-primary" disabled={busy}>
            {busy ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Record expense'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function validExpenseRange(from: string, to: string) {
  if (!from || !to) return true
  const a = Date.parse(from + 'T00:00:00Z')
  const b = Date.parse(to + 'T00:00:00Z')
  return Number.isFinite(a) && Number.isFinite(b) && b >= a && (b - a) / 86400000 + 1 <= 367
}

function today() {
  const now = new Date()
  return (
    now.getFullYear() +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0')
  )
}

function label(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ')
}

function money(value: number, currency: string, opts?: { cents?: boolean }) {
  const showCents = opts?.cents ?? true
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(value)
}

function messageOf(error: unknown) {
  return formatApiError(error)
}
