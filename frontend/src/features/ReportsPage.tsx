/* eslint-disable react-hooks/set-state-in-effect -- The effect loads the export choices for the active business. */
import { useCallback, useEffect, useState } from 'react'
import { exportAnalytics } from '../api/exportApi'
import { listDatasets, exportDatasetRows } from '../api/datasetApi'
import { exportExpenseSummary, exportExpenses } from '../api/expenseApi'
import { exportInventory, exportInventoryMovements, listInventory } from '../api/inventoryApi'
import { formatApiError } from '../api/formatError'
import type { DatasetMetadata, InventoryItem } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { EmptyState, LoadingLine, Message } from '../components/Feedback'
import { saveCsvDownload } from '../utils/download'
import { isAnalyticsDateRangeValid, isDateRangeValid, loadAllInventoryItems } from './reportsData'
import { PageHeader } from '../soho/components/misc'
import type { PageCallbacks } from './types'

type ExportId = 'analytics' | 'expenses' | 'expense-summary' | 'inventory' | 'movements' | 'dataset-rows'

export function ReportsPage({ onError, onNotice }: PageCallbacks) {
  const { business } = useWorkspace()
  const [range, setRange] = useState(defaultRange)
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [datasetId, setDatasetId] = useState('')
  const [itemId, setItemId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<ExportId | null>(null)
  const [loadError, setLoadError] = useState('')

  const loadChoices = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    const [datasetResult, inventoryResult] = await Promise.allSettled([
      listDatasets(business.id),
      loadAllInventoryItems((page, size) => listInventory(business.id, page, size)),
    ])
    if (datasetResult.status === 'fulfilled') {
      setDatasets(datasetResult.value)
      setDatasetId((current) => datasetResult.value.some((dataset) => String(dataset.id) === current) ? current : String(datasetResult.value[0]?.id ?? ''))
    } else setLoadError(`Datasets: ${formatApiError(datasetResult.reason)}`)
    if (inventoryResult.status === 'fulfilled') {
      setItems(inventoryResult.value)
      setItemId((current) => inventoryResult.value.some((item) => String(item.id) === current) ? current : '')
    } else setLoadError((current) => [current, `Inventory: ${formatApiError(inventoryResult.reason)}`].filter(Boolean).join(' '))
    setLoading(false)
  }, [business.id])

  useEffect(() => { void loadChoices() }, [loadChoices])

  async function download(id: ExportId) {
    if (busy) return
    setBusy(id)
    onError('')
    try {
      const result = id === 'analytics' ? await exportAnalytics(business.id, range.from, range.to)
        : id === 'expenses' ? await exportExpenses(business.id, range.from, range.to)
          : id === 'expense-summary' ? await exportExpenseSummary(business.id, range.from, range.to)
            : id === 'inventory' ? await exportInventory(business.id)
              : id === 'movements' ? await exportInventoryMovements(business.id, itemId ? Number(itemId) : undefined)
                : await exportDatasetRows(business.id, Number(datasetId))
      const filename = id === 'analytics' ? 'soho-analytics.csv'
        : id === 'expenses' ? 'soho-expenses.csv'
          : id === 'expense-summary' ? 'soho-expense-summary.csv'
            : id === 'inventory' ? 'soho-inventory.csv'
              : id === 'movements' ? 'soho-inventory-movements.csv'
                : `dataset-${datasetId}-rows.csv`
      saveCsvDownload(result, filename)
      onNotice(`${filename} download started.`)
    } catch (error) { onError(formatApiError(error)) }
    finally { setBusy(null) }
  }

  return <div className="feature-stack">
    <PageHeader
      eyebrow="Reports"
      title="Download business data"
      description="Generate supported CSV data exports from the active business workspace. Reports are streamed live on request and not stored."
      actions={
        <div className="date-range flex items-end gap-2 bg-surface p-2 rounded-lg border border-border shadow-xs">
          <label className="text-xs font-semibold text-muted-foreground">
            From
            <input className="mt-1" type="date" value={range.from} max={range.to} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            To
            <input className="mt-1" type="date" value={range.to} min={range.from} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} />
          </label>
        </div>
      }
    />
    {loadError && (
      <div className="report-load-error">
        <Message variant="warning" text={`${loadError} Some exports may be unavailable until the choices load.`} />
        <button className="button-quiet button-small" type="button" onClick={() => void loadChoices()} disabled={loading}>
          Retry loading choices
        </button>
      </div>
    )}
    {loading ? (
      <section className="content-panel panel-pad">
        <LoadingLine text="Loading datasets and inventory choices…" />
      </section>
    ) : (
      <div className="reports-grid">
        <ExportPanel
          title="Sales analytics"
          description={`Mapped performance and sales metrics for ${range.from} through ${range.to}.`}
          detail="CSV Export"
          busy={busy === 'analytics'}
          disabled={busy !== null || !isAnalyticsDateRangeValid(range.from, range.to)}
          onDownload={() => void download('analytics')}
        />
        <ExportPanel
          title="Operating expenses"
          description={`Complete itemized operating cost records for ${range.from} through ${range.to}.`}
          detail="CSV Export"
          busy={busy === 'expenses'}
          disabled={busy !== null || !isDateRangeValid(range.from, range.to)}
          onDownload={() => void download('expenses')}
        />
        <ExportPanel
          title="Expense summary"
          description="Aggregated totals grouped by currency and operational category for the selected dates."
          detail="CSV Export"
          busy={busy === 'expense-summary'}
          disabled={busy !== null || !isDateRangeValid(range.from, range.to)}
          onDownload={() => void download('expense-summary')}
        />
        <ExportPanel
          title="Stock inventory"
          description="Current stock ledger balances and status for all catalogue items."
          detail="CSV Export"
          busy={busy === 'inventory'}
          disabled={busy !== null}
          onDownload={() => void download('inventory')}
        />
        <section className="content-panel report-panel hover:border-border-strong transition-all">
          <div>
            <span className="report-format">CSV Export</span>
            <h2>Stock movements</h2>
            <p>Comprehensive audit ledger of receipts, counts, and stock adjustments.</p>
          </div>
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-muted-foreground">
              Filter by item
              <select
                className="mt-1"
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
              >
                <option value="">All inventory items</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.sku ? ` · ${item.sku}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-secondary w-full" disabled={busy !== null} onClick={() => void download('movements')}>
              {busy === 'movements' ? 'Preparing CSV…' : 'Download CSV'}
            </button>
          </div>
        </section>
        <section className="content-panel report-panel hover:border-border-strong transition-all">
          <div>
            <span className="report-format">CSV Export</span>
            <h2>Raw dataset rows</h2>
            <p>Download stored rows and columns from an imported dataset in this workspace.</p>
          </div>
          <div className="space-y-3 pt-2">
            {datasets.length ? (
              <label className="block text-xs font-semibold text-muted-foreground">
                Select dataset
                <select
                  className="mt-1"
                  value={datasetId}
                  onChange={(event) => setDatasetId(event.target.value)}
                >
                  {datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <EmptyState title="No datasets available" description="Import a dataset before downloading its rows." />
            )}
            <button className="button-secondary w-full" disabled={!datasetId || busy !== null} onClick={() => void download('dataset-rows')}>
              {busy === 'dataset-rows' ? 'Preparing CSV…' : 'Download CSV'}
            </button>
          </div>
        </section>
      </div>
    )}
    <p className="table-footnote">
      Only CSV exports supported by the backend API are listed here. Date filters apply to analytics and expense exports; inventory and dataset exports cover their full scope.
    </p>
  </div>
}

function ExportPanel({ title, description, detail, busy, disabled, onDownload }: { title: string; description: string; detail: string; busy: boolean; disabled?: boolean; onDownload: () => void }) {
  return <section className="content-panel report-panel"><div><span className="report-format">{detail}</span><h2>{title}</h2><p>{description}</p></div><button className="button-secondary" disabled={disabled || busy} onClick={onDownload}>{busy ? 'Preparing CSV…' : 'Download CSV'}</button></section>
}

function defaultRange() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 29)
  return { from: localDate(from), to: localDate(to) }
}
function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
