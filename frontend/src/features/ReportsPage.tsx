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
    <PageHeader eyebrow="Reports" title="Download business data" description="Generate supported CSV exports from the current business. Reports are created when requested and are not stored." actions={<div className="date-range"><label>From<input type="date" value={range.from} max={range.to} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} /></label><label>To<input type="date" value={range.to} min={range.from} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} /></label></div>} />
    {loadError && <div className="report-load-error"><Message variant="warning" text={`${loadError} Some exports may be unavailable until the choices load.`} /><button className="button-quiet button-small" type="button" onClick={() => void loadChoices()} disabled={loading}>Retry loading choices</button></div>}
    {loading ? <section className="content-panel panel-pad"><LoadingLine text="Loading datasets and inventory choices…" /></section> : <div className="reports-grid">
      <ExportPanel title="Analytics" description={`Mapped sales metrics for ${range.from} through ${range.to}. Analytics accepts up to 366 days.`} detail="CSV" busy={busy === 'analytics'} disabled={busy !== null || !isAnalyticsDateRangeValid(range.from, range.to)} onDownload={() => void download('analytics')} />
      <ExportPanel title="Expenses" description="Expense records for the selected date range." detail="CSV" busy={busy === 'expenses'} disabled={busy !== null || !isDateRangeValid(range.from, range.to)} onDownload={() => void download('expenses')} />
      <ExportPanel title="Expense summary" description="Totals grouped by currency and category for the selected dates." detail="CSV" busy={busy === 'expense-summary'} disabled={busy !== null || !isDateRangeValid(range.from, range.to)} onDownload={() => void download('expense-summary')} />
      <ExportPanel title="Inventory" description="Current inventory items and quantities from the stock ledger." detail="CSV" busy={busy === 'inventory'} disabled={busy !== null} onDownload={() => void download('inventory')} />
      <section className="content-panel report-panel"><div><span className="report-format">CSV</span><h2>Stock movements</h2><p>Movement history for all items, or narrow it to one item.</p></div><label>Inventory item<select value={itemId} onChange={(event) => setItemId(event.target.value)}><option value="">All inventory items</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}{item.sku ? ` · ${item.sku}` : ''}</option>)}</select></label><button className="button-secondary" disabled={busy !== null} onClick={() => void download('movements')}>{busy === 'movements' ? 'Preparing CSV…' : 'Download CSV'}</button></section>
      <section className="content-panel report-panel"><div><span className="report-format">CSV</span><h2>Dataset rows</h2><p>Download parsed rows from one dataset in this business.</p></div>{datasets.length ? <label>Dataset<select value={datasetId} onChange={(event) => setDatasetId(event.target.value)}>{datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}</select></label> : <EmptyState title="No datasets available" description="Import a dataset before downloading its rows." />}<button className="button-secondary" disabled={!datasetId || busy !== null} onClick={() => void download('dataset-rows')}>{busy === 'dataset-rows' ? 'Preparing CSV…' : 'Download CSV'}</button></section>
    </div>}
    <p className="table-footnote">Only CSV exports currently supported by this business API are listed here. Date filters apply to analytics and expense exports; inventory and dataset exports use their supported API scope.</p>
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
