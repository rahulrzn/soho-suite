/* eslint-disable react-hooks/set-state-in-effect -- The effect loads filtered expenses and their summary. */
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createExpense, deleteExpense, exportExpenseSummary, exportExpenses, getExpenseSummary, listExpenses, updateExpense } from '../api/expenseApi'
import { formatApiError } from '../api/formatError'
import type { Expense, ExpenseCategory, ExpenseSummary } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { ConfirmDialog, Modal } from '../components/Modal'
import { EmptyState, LoadingLine, Message } from '../components/Feedback'
import type { PageCallbacks } from './types'
import { saveCsvDownload } from '../utils/download'

const categories: ExpenseCategory[] = ['RENT', 'UTILITIES', 'PAYROLL', 'MARKETING', 'SUPPLIES', 'TRANSPORT', 'PROFESSIONAL_SERVICES', 'MAINTENANCE', 'OTHER']
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
  const [downloadBusy, setDownloadBusy] = useState(false)
  const editable = role === 'OWNER' || role === 'MANAGER'

  const load = useCallback(async () => {
    if (!validExpenseRange(applied.from, applied.to)) { onError('Expense date filters can cover at most 367 inclusive days.'); setLoading(false); return }
    setLoading(true)
    try {
      const [result, totals] = await Promise.all([
        listExpenses(business.id, { from: applied.from || undefined, to: applied.to || undefined, category: (applied.category || undefined) as ExpenseCategory | undefined, page, size }),
        getExpenseSummary(business.id, { from: applied.from || undefined, to: applied.to || undefined }),
      ])
      setItems(result.items); setTotal(result.total); setSummary(totals)
    } catch (error) { onError(messageOf(error)) }
    finally { setLoading(false) }
  }, [business.id, applied, page, onError])
  useEffect(() => { void load() }, [load])

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
    if (!/^\d{1,15}(\.\d{1,4})?$/.test(body.amount) || Number(body.amount) <= 0) { onError('Enter a positive amount with up to 15 integer digits and 4 decimal places.'); return }
    setBusy(true); onError('')
    try {
      if (modal === 'edit' && selected) await updateExpense(business.id, selected.id, body)
      else await createExpense(business.id, body)
      setModal(null); setSelected(null); onNotice(modal === 'edit' ? 'Expense updated.' : 'Expense recorded.'); await load()
    } catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!selected) return
    setBusy(true)
    try { await deleteExpense(business.id, selected.id); setModal(null); setSelected(null); onNotice('Expense deleted.'); await load() }
    catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function download(kind: 'expenses' | 'summary') {
    if (downloadBusy) return
    setDownloadBusy(true)
    try {
      const result = kind === 'expenses' ? await exportExpenses(business.id, applied.from || undefined, applied.to || undefined) : await exportExpenseSummary(business.id, applied.from || undefined, applied.to || undefined)
      saveCsvDownload(result, 'soho-expenses-' + kind + '.csv')
      onNotice('CSV download started.')
    } catch (error) { onError(messageOf(error)) }
    finally { setDownloadBusy(false) }
  }
  function applyFilters(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPage(0); setApplied(filters) }

  return <div className="feature-stack">
    <section className="operations-intro content-panel"><div><p className="section-label">KEEP TRACK OF BUSINESS COSTS</p><h2>A clearer view of where money goes.</h2><p>Expenses use the business currency at the time they are created. Soho Suite does not convert amounts or combine them with sales analytics.</p></div><div className="inline-actions"><button className="button-secondary" disabled={downloadBusy} onClick={() => void download('summary')}>{downloadBusy ? 'Preparing CSV…' : 'Summary CSV'}</button><button className="button-secondary" disabled={downloadBusy} onClick={() => void download('expenses')} title="The export endpoint supports date filters but not the category filter">Expenses CSV</button>{editable && <button className="button-primary" onClick={() => { setSelected(null); setModal('create') }}>Add expense <span aria-hidden="true">+</span></button>}</div><p className="export-filter-note">CSV exports honor the date range. The backend export does not accept the category filter.</p></section>
    {!editable && <Message variant="warning" text="Your role can view expenses. An owner or manager can create, edit, or delete them." />}
    <section className="summary-currency-grid">{summary?.currencies.length ? summary.currencies.map((currency) => <article className="content-panel expense-summary-card" key={currency.currency}><p className="section-label">{currency.currency} TOTAL</p><strong>{money(currency.total, currency.currency)}</strong><div>{currency.categories.slice(0, 4).map((entry) => <span key={entry.category}>{label(entry.category)} <b>{money(entry.total, currency.currency)}</b></span>)}{currency.categories.length > 4 && <small>{currency.categories.length - 4} more categories</small>}</div></article>) : <article className="content-panel empty-summary"><strong>No expenses in this period</strong><span>Totals are grouped by business currency and category.</span></article>}</section>
    <section className="content-panel panel-pad">
      <div className="panel-heading"><div><p className="section-label">EXPENSE REGISTER</p><h2>Business expenses</h2><p>{total.toLocaleString()} records · sorted and paginated by the backend</p></div></div>
      <form className="expense-filter-row" onSubmit={applyFilters}><label>From<input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => setFilters((value) => ({ ...value, from: event.target.value }))} /></label><label>To<input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => setFilters((value) => ({ ...value, to: event.target.value }))} /></label><label>Category<select value={filters.category} onChange={(event) => setFilters((value) => ({ ...value, category: event.target.value }))}><option value="">All categories</option>{categories.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select></label><button className="button-secondary button-small">Apply filters</button><button className="button-quiet button-small" type="button" onClick={() => { const empty = { from: '', to: '', category: '' }; setFilters(empty); setApplied(empty); setPage(0) }}>Clear</button></form>
      {loading ? <LoadingLine text="Loading expense records…" /> : items.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Reference</th><th></th></tr></thead><tbody>{items.map((expense) => <tr key={expense.id}><td>{new Date(expense.expenseDate + 'T00:00:00').toLocaleDateString()}</td><td><strong>{expense.description}</strong></td><td>{label(expense.category)}</td><td>{money(expense.amount, expense.currency)}</td><td>{expense.reference || '—'}</td><td>{editable && <div className="inline-actions"><button className="button-quiet button-small" onClick={() => { setSelected(expense); setModal('edit') }}>Edit</button><button className="button-quiet button-small" onClick={() => { setSelected(expense); setModal('delete') }}>Delete</button></div>}</td></tr>)}</tbody></table></div> : <EmptyState title="No expenses found" description="Try another date range or category, or record the first expense for this business." action={editable ? <button className="button-primary" onClick={() => setModal('create')}>Add an expense</button> : undefined} />}
      <div className="pagination-row"><span>Page {page + 1} of {Math.max(1, Math.ceil(total / size))}</span><div className="inline-actions"><button className="button-secondary button-small" disabled={loading || page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button><button className="button-secondary button-small" disabled={loading || (page + 1) * size >= total} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
    </section>
    {(modal === 'create' || modal === 'edit') && <ExpenseFormModal key={modal + '-' + selected?.id} mode={modal} expense={selected} busy={busy} onClose={() => setModal(null)} onSubmit={save} />}
    {modal === 'delete' && selected && <ConfirmDialog title="Delete this expense?" description="The expense will be removed from this business and its activity history will record the change." confirmLabel="Delete expense" destructive busy={busy} onCancel={() => setModal(null)} onConfirm={() => void remove()} />}
  </div>
}

function ExpenseFormModal({ mode, expense, busy, onClose, onSubmit }: { mode: 'create' | 'edit'; expense: Expense | null; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal title={mode === 'edit' ? 'Edit expense' : 'Record an expense'} description="Enter amounts in the business currency. The backend validates dates and amount precision." onClose={onClose}>
    <form className="field-stack" onSubmit={(event) => onSubmit(event)}>
      <label>Date<input type="date" name="expenseDate" defaultValue={expense?.expenseDate ?? today()} required /></label>
      <label>Amount<input name="amount" inputMode="decimal" pattern="\d{1,15}(\.\d{1,4})?" placeholder="0.00" defaultValue={expense ? String(expense.amount) : ''} required /></label>
      <label>Category<select name="category" defaultValue={expense?.category ?? 'OTHER'} required>{categories.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select></label>
      <label>Description<input name="description" maxLength={240} defaultValue={expense?.description ?? ''} required /></label>
      <label>Reference <span className="optional-label">Optional</span><input name="reference" maxLength={100} defaultValue={expense?.reference ?? ''} /></label>
      <div className="modal-actions"><button className="button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Record expense'}</button></div>
    </form>
  </Modal>
}
function validExpenseRange(from: string, to: string) { if (!from || !to) return true; const a = Date.parse(from + 'T00:00:00Z'); const b = Date.parse(to + 'T00:00:00Z'); return Number.isFinite(a) && Number.isFinite(b) && b >= a && (b - a) / 86400000 + 1 <= 367 }
function today() { const now = new Date(); return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') }
function label(value: string) { return value.toLowerCase().split('_').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' ') }
function money(value: number, currency: string) { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) }
function messageOf(error: unknown) { return formatApiError(error) }
