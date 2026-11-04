/* eslint-disable react-hooks/set-state-in-effect -- Effects load analytics and dataset mapping from the backend. */
import { useCallback, useEffect, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { configureAnalytics, getAnalyticsOverview, getHealthScore } from '../api/analyticsApi'
import { getDataset, listDatasets } from '../api/datasetApi'
import { exportAnalytics } from '../api/exportApi'
import { formatApiError } from '../api/formatError'
import type { AnalyticsOverview, DatasetDetail, DatasetMetadata, HealthScore } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { EmptyState, LoadingLine, Message } from '../components/Feedback'
import { DateRange, MetricStatus } from './OverviewPage'
import { AnalyticsScreen } from '../soho/screens/analytics-screen'
import type { PageCallbacks } from './types'
import { saveCsvDownload } from '../utils/download'

const blankMapping = { dateColumn: '', lineAmountColumn: '', orderIdColumn: '', customerIdColumn: '', confirmedCurrency: '' }

export function AnalyticsPage({ onError, onNotice }: PageCallbacks) {
  const { business, role } = useWorkspace()
  const [range, setRange] = useState(defaultRange)
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<DatasetDetail | null>(null)
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [score, setScore] = useState<HealthScore | null>(null)
  const [dateBusy, setDateBusy] = useState(true)
  const [configBusy, setConfigBusy] = useState(false)
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [mapping, setMapping] = useState({ ...blankMapping, confirmedCurrency: business.businessCurrency ?? '' })

  const loadDatasets = useCallback(async () => {
    try { setDatasets((await listDatasets(business.id)).filter((item) => item.status === 'IMPORTED')) }
    catch (error) { onError(messageOf(error)) }
  }, [business.id, onError])
  useEffect(() => { void loadDatasets() }, [loadDatasets])

  const loadResults = useCallback(async () => {
    if (!validRange(range.from, range.to)) { onError('Choose a valid date range of no more than 366 days.'); setDateBusy(false); return }
    setDateBusy(true)
    const [overviewResult, scoreResult] = await Promise.allSettled([
      getAnalyticsOverview(business.id, range.from, range.to),
      getHealthScore(business.id, range.from, range.to),
    ])
    if (overviewResult.status === 'fulfilled') {
      setOverview(overviewResult.value)
      setConfigured(Boolean(overviewResult.value.datasetId))
      if (overviewResult.value.datasetId) setSelectedId(String(overviewResult.value.datasetId))
    } else { setOverview(null); onError(messageOf(overviewResult.reason)) }
    if (scoreResult.status === 'fulfilled') setScore(scoreResult.value)
    else setScore(null)
    setDateBusy(false)
  }, [business.id, range.from, range.to, onError])
  useEffect(() => { void loadResults() }, [loadResults])

  useEffect(() => {
    const id = Number(selectedId)
    if (!id) { setDetail(null); return }
    let active = true
    void getDataset(business.id, id).then((result) => { if (active) setDetail(result) }).catch((error) => { if (active) { setDetail(null); onError(messageOf(error)) } })
    return () => { active = false }
  }, [business.id, selectedId, onError])

  async function saveConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const datasetId = Number(selectedId)
    if (!datasetId || !detail) return
    if (!validMapping(mapping)) { onError('Map a date, line amount, and order ID column. Each mapped role must use a different column.'); return }
    if (!/^[A-Z]{3}$/.test(mapping.confirmedCurrency)) { onError('Confirm the business currency using its uppercase three-letter ISO code.'); return }
    setConfigBusy(true)
    try {
      await configureAnalytics(business.id, {
        datasetId, dateColumn: mapping.dateColumn, lineAmountColumn: mapping.lineAmountColumn,
        orderIdColumn: mapping.orderIdColumn, customerIdColumn: mapping.customerIdColumn || undefined,
        confirmedCurrency: mapping.confirmedCurrency,
      })
      onNotice('Analytics source saved. The backend is recalculating availability for this dataset.')
      setConfigured(true)
      await loadResults()
    } catch (error) { onError(messageOf(error)) }
    finally { setConfigBusy(false) }
  }

  async function downloadAnalytics() {
    if (!validRange(range.from, range.to)) { onError('Choose a valid date range of no more than 366 days before exporting.'); return }
    setDownloadBusy(true)
    try { const result = await exportAnalytics(business.id, range.from, range.to); saveCsvDownload(result, 'soho-analytics.csv'); onNotice('Analytics CSV download started.') }
    catch (error) { onError(messageOf(error)) }
    finally { setDownloadBusy(false) }
  }

  const columns = [...new Set((detail?.columns ?? []).map((column) => column.name))]
  const canConfigure = role === 'OWNER' || role === 'MANAGER'
  const screenMetrics = overview ? [
    screenMetric('sales', 'Imported sales', overview.totalSalesAmount, (value) => formatMoney(value, overview.currency)),
    screenMetric('orders', 'Orders', overview.distinctOrderCount, (value) => value.toLocaleString()),
    screenMetric('aov', 'Average order value', overview.averageOrderValue, (value) => formatMoney(value, overview.currency)),
    screenMetric('sales-change', 'Sales change', overview.salesChangePercent, (value) => (value > 0 ? '+' : '') + value.toFixed(2) + '%'),
  ] : []
  return <div className="feature-stack">
    <AnalyticsScreen businessName={business.tradingName || business.company} dateLabel={`${range.from} to ${range.to}`} currency={overview?.currency ?? business.businessCurrency} metrics={screenMetrics} dailyTrend={overview?.dailySalesTrend ?? { status: 'UNAVAILABLE', value: null, reason: 'Analytics have not returned for this period yet.' }} rangeControl={<DateRange range={range} onChange={setRange} />} exportBusy={downloadBusy} onExport={() => void downloadAnalytics()} />
    <section className="content-panel panel-pad">
      <div className="panel-heading"><div><p className="section-label">SOURCE DATASET</p><h2>Choose what analytics reads</h2><p>The backend reads confirmed imports only. Column names must match the reviewed dataset.</p></div>{configured && <span className="status-tag">Configured</span>}</div>
      {!canConfigure && <Message variant="warning" text="Your role can view analytics, but only an owner or manager can change the source mapping." />}
      {canConfigure ? <form className="analytics-config-form" onSubmit={(event) => void saveConfiguration(event)}>
        <label>Confirmed dataset<select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setMapping((value) => ({ ...value, dateColumn: '', lineAmountColumn: '', orderIdColumn: '', customerIdColumn: '' })) }}><option value="">Select an imported dataset</option>{datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name} Â· {dataset.rowCount.toLocaleString()} rows</option>)}</select></label>
        {!datasets.length && <p className="quiet-text">Import and confirm a dataset before configuring analytics.</p>}
        {selectedId && detail && <div className="mapping-grid">
          {mappingField('Date column', 'dateColumn', mapping, setMapping, columns, ['lineAmountColumn', 'orderIdColumn', 'customerIdColumn'])}
          {mappingField('Line amount column', 'lineAmountColumn', mapping, setMapping, columns, ['dateColumn', 'orderIdColumn', 'customerIdColumn'])}
          {mappingField('Order ID column', 'orderIdColumn', mapping, setMapping, columns, ['dateColumn', 'lineAmountColumn', 'customerIdColumn'])}
          {mappingField('Customer ID column', 'customerIdColumn', mapping, setMapping, columns, ['dateColumn', 'lineAmountColumn', 'orderIdColumn'], true)}
          <label>Confirm business currency<input value={mapping.confirmedCurrency} maxLength={3} pattern="[A-Z]{3}" onChange={(event) => setMapping((value) => ({ ...value, confirmedCurrency: event.target.value.toUpperCase() }))} required aria-describedby="currency-confirm-help" /></label>
          <p className="mapping-help" id="currency-confirm-help">Amounts are not converted. If the business currency changes, confirm this mapping again.</p>
        </div>}
        {selectedId && !detail && <LoadingLine text="Loading the datasetâ€™s reviewed column namesâ€¦" />}
        <div className="form-actions"><button className="button-primary" disabled={!canConfigure || !detail || configBusy}>{configBusy ? 'Saving mappingâ€¦' : 'Save analytics mapping'}</button></div>
      </form> : <p className="quiet-text">The current source dataset is shown through the returned analytics response when available.</p>}
    </section>

    {dateBusy ? <section className="content-panel panel-pad"><LoadingLine text="Loading analytics for this periodâ€¦" /></section> : overview ? <>
      <section className="content-panel panel-pad"><div className="panel-heading"><div><p className="section-label">DATA QUALITY AND COVERAGE</p><h2>Metric availability</h2><p>{overview.datasetName ? 'Source: ' + overview.datasetName : 'No analytics dataset is configured for this business.'} Â· {overview.from} to {overview.to}</p></div></div>
        <div className="availability-list">{[
          ['Imported sales', overview.totalSalesAmount], ['Orders', overview.distinctOrderCount], ['Average order value', overview.averageOrderValue], ['Customers', overview.distinctCustomerCount], ['Daily sales trend', overview.dailySalesTrend], ['Sales change', overview.salesChangePercent],
        ].map(([name, metric]) => { const result = metric as { status: string; reason: string | null }; return <div className="availability-row" key={name as string}><strong>{name as string}</strong><MetricStatus status={result.status} /><span>{result.reason || 'The backend returned this metric for the selected date range.'}</span></div> })}</div>
      </section>
      <section className="content-panel panel-pad"><div className="panel-heading"><div><p className="section-label">HEALTH SCORE</p><h2>Sales change indicator</h2></div>{score?.status === 'AVAILABLE' && score.score !== null ? <span className="score-badge">{score.score} / 100</span> : <span className="status-tag status-muted">{score?.status?.toLowerCase() ?? 'unavailable'}</span>}</div>
        {score?.interpretation && <p className="score-copy">{score.interpretation}</p>}
        {score?.components?.length ? <details className="score-method"><summary>How the score is calculated</summary>{score.components.map((component) => <div key={component.name}><strong>{component.name}</strong><span>{component.weightPercent}% of the score · {component.inputStatus.toLowerCase()}</span><p>{component.formula}</p>{component.reason && <small>{component.reason}</small>}</div>)}</details> : null}
        {score?.limitations && <p className="data-footnote">{score.limitations}</p>}
      </section>
    </> : <section className="content-panel panel-pad"><EmptyState title="Analytics could not be loaded" description="The backend did not return analytics for this date range. Check the request status and try again." /></section>}
  </div>
}

function mappingField(label: string, key: keyof typeof blankMapping, mapping: typeof blankMapping, setMapping: Dispatch<SetStateAction<typeof blankMapping>>, columns: string[], conflicts: (keyof typeof blankMapping)[], optional = false) {
  const used = conflicts.map((field) => mapping[field]).filter(Boolean)
  return <label>{label}{optional && <span className="optional-label">Optional</span>}<select value={mapping[key]} required={!optional} onChange={(event) => setMapping((value) => ({ ...value, [key]: event.target.value }))}><option value="">{optional ? 'No customer column' : 'Choose a reviewed column'}</option>{columns.filter((column) => !used.includes(column) || column === mapping[key]).map((column) => <option value={column} key={column}>{column}</option>)}</select></label>
}
function validMapping(value: typeof blankMapping) { const required = [value.dateColumn, value.lineAmountColumn, value.orderIdColumn]; const mapped = [...required, ...(value.customerIdColumn ? [value.customerIdColumn] : [])]; return required.every(Boolean) && new Set(mapped).size === mapped.length }
function screenMetric(id: string, label: string, metric: { status: string; value: number | null; reason: string | null }, format: (value: number) => string) { return { id, label, value: metric.status === 'AVAILABLE' && metric.value !== null ? format(metric.value) : null, status: metric.status, reason: metric.reason } }
function defaultRange() { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - 29); return { from: isoLocal(from), to: isoLocal(to) } }
function isoLocal(value: Date) { return value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0') + '-' + String(value.getDate()).padStart(2, '0') }
function validRange(from: string, to: string) { const a = Date.parse(from + 'T00:00:00Z'); const b = Date.parse(to + 'T00:00:00Z'); return Number.isFinite(a) && Number.isFinite(b) && b >= a && (b - a) / 86400000 + 1 <= 366 }
function formatMoney(value: number, currency: string | null) { return currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) : value.toLocaleString(undefined, { maximumFractionDigits: 2 }) }
function messageOf(error: unknown) { return formatApiError(error) }
