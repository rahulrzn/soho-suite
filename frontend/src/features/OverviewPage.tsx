/* eslint-disable react-hooks/set-state-in-effect -- The effect loads overview data when its date range changes. */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { getAnalyticsOverview, getHealthScore } from '../api/analyticsApi'
import { getActivity } from '../api/activityApi'
import { listExpenses } from '../api/expenseApi'
import { exportAnalytics } from '../api/exportApi'
import type { ActivityEvent, AnalyticsOverview, HealthScore, Metric } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { EmptyState, LoadingLine } from '../components/Feedback'
import { Button } from '../soho/components/button'
import type { SeriesDef } from '../soho/components/charts'
import { Download } from 'lucide-react'
import { formatApiError } from '../api/formatError'
import { saveCsvDownload } from '../utils/download'
import type { TrendPoint } from '../soho/types'
import type { PageCallbacks } from './types'
import { buildDashboardPresentation } from './dashboardMockupPresentation'
import { buildDashboardPerformance, getDashboardDateRange, loadAllExpenses, type DashboardPreset } from './dashboardData'
import { RequestSequence } from './requestSequence'

const DashboardScreen = lazy(() => import('../soho/screens/dashboard-screen').then(({ DashboardScreen: screen }) => ({ default: screen })))

export function OverviewPage({ onError, onNotice }: PageCallbacks) {
  const { business, profile } = useWorkspace()
  const [preset, setPreset] = useState<DashboardPreset | 'CUSTOM'>('YTD')
  const [range, setRange] = useState(() => getDashboardDateRange('YTD'))
  const [customRange, setCustomRange] = useState(range)
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null)
  const [score, setScore] = useState<HealthScore | null>(null)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [performance, setPerformance] = useState<TrendPoint[]>([])
  const [performanceUnavailableReason, setPerformanceUnavailableReason] = useState<string | null>(null)
  const [expensesAvailable, setExpensesAvailable] = useState(true)
  const [busy, setBusy] = useState(true)
  const [exporting, setExporting] = useState(false)
  const dataRequests = useRef(new RequestSequence())

  const reloadData = useCallback(async () => {
    const requestId = dataRequests.current.next()
    if (!validRange(range.from, range.to)) {
      onError('Choose a valid date range of no more than 366 days.')
      setBusy(false)
      return
    }
    setBusy(true)
    const [overviewResult, scoreResult, activityResult, expenseResult] = await Promise.allSettled([
      getAnalyticsOverview(business.id, range.from, range.to),
      getHealthScore(business.id, range.from, range.to),
      getActivity(business.id, 0, 5),
      loadAllExpenses((page, size, from, to) => listExpenses(business.id, { from, to, page, size }), range.from, range.to),
    ])
    if (!dataRequests.current.isCurrent(requestId)) return
    const failures: string[] = []
    if (overviewResult.status === 'fulfilled') setAnalytics(overviewResult.value)
    else { setAnalytics(null); failures.push(errorText(overviewResult.reason)) }
    if (scoreResult.status === 'fulfilled') setScore(scoreResult.value)
    else { setScore(null); failures.push(errorText(scoreResult.reason)) }
    if (activityResult.status === 'fulfilled') setActivity(activityResult.value.items)
    else { setActivity([]); failures.push(errorText(activityResult.reason)) }
    if (overviewResult.status === 'fulfilled') {
      const trend = overviewResult.value.dailySalesTrend
      const sales = trend.status === 'AVAILABLE' && trend.value?.length ? trend.value : null
      setPerformance(buildDashboardPerformance(
        sales,
        expenseResult.status === 'fulfilled' ? expenseResult.value : [],
        overviewResult.value.currency ?? business.businessCurrency,
        range.from,
        range.to,
      ))
      setPerformanceUnavailableReason(sales === null
        ? trend.reason ?? 'No daily sales data is available for this date range.'
        : null)
    } else {
      setPerformance([])
      setPerformanceUnavailableReason('Revenue trend could not be loaded for this date range.')
    }
    setExpensesAvailable(expenseResult.status === 'fulfilled')
    if (expenseResult.status === 'rejected') failures.push(`Expenses: ${errorText(expenseResult.reason)}`)
    if (failures.length) onError([...new Set(failures)].join(' '))
    setBusy(false)
  }, [business.businessCurrency, business.id, range.from, range.to, onError])

  useEffect(() => {
    const requests = dataRequests.current
    void reloadData()
    return () => { requests.next() }
  }, [reloadData])

  const dashboard = buildDashboardPresentation(analytics, score, activity)
  const trendSeries: SeriesDef[] = [
    { key: 'revenue', label: 'Revenue', color: 'var(--chart-1)' },
    ...(expensesAvailable ? [{ key: 'expenses', label: 'Expenses', color: 'var(--chart-2)', kind: 'line' as const }] : []),
  ]

  function selectPreset(next: DashboardPreset) {
    setPreset(next)
    const nextRange = getDashboardDateRange(next)
    setRange(nextRange)
    setCustomRange(nextRange)
  }

  function openCustomRange() {
    setCustomRange(range)
    setPreset('CUSTOM')
  }

  function applyCustomRange() {
    if (!validRange(customRange.from, customRange.to)) {
      onError('Choose a valid date range of no more than 366 days.')
      return
    }
    onError('')
    setRange(customRange)
  }

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    onError('')
    try {
      const result = await exportAnalytics(business.id, range.from, range.to)
      saveCsvDownload(result, 'soho-analytics.csv')
      onNotice('Analytics CSV download started.')
    } catch (error) { onError(formatApiError(error)) }
    finally { setExporting(false) }
  }

  return <div className="feature-stack">
    {analytics !== null || busy ? <Suspense fallback={<LoadingLine text="Opening dashboard…" />}><DashboardScreen
      userFirstName={profile.firstName}
      businessName={business.tradingName || business.company}
      dateLabel={formatDateRangeLabel(range.from, range.to)}
      currencyCode={analytics?.currency ?? business.businessCurrency}
      health={dashboard.health}
      healthUnavailableReason={dashboard.healthUnavailableReason}
      healthFactors={dashboard.healthFactors}
      dataFreshness={dashboard.dataFreshness}
      salesAvailability={dashboard.salesAvailability}
      kpis={dashboard.kpis}
      revenueTrend={performance}
      revenueTrendUnavailableReason={performanceUnavailableReason}
      trendSeries={trendSeries}
      insights={dashboard.insights}
      topCategories={dashboard.topCategories}
      stockAlerts={dashboard.stockAlerts}
      recentActivity={dashboard.recentActivity}
      refreshing={busy}
      rangeControl={<DashboardActions preset={preset} range={customRange} exporting={exporting} onPreset={selectPreset} onOpenCustom={openCustomRange} onRangeChange={setCustomRange} onApplyCustom={applyCustomRange} onExport={() => void handleExport()} />}
    /></Suspense> : null}

    {!busy && !analytics && <section className="content-panel panel-pad"><EmptyState title="Overview could not be loaded" description="The backend did not return sales data. Check the request status and refresh this page." /></section>}
  </div>
}

export function DateRange({ range, onChange }: { range: { from: string; to: string }; onChange: (range: { from: string; to: string }) => void }) {
  return <div className="date-range"><label>From<input type="date" value={range.from} max={range.to} onChange={(event) => onChange({ ...range, from: event.target.value })} /></label><label>To<input type="date" value={range.to} min={range.from} onChange={(event) => onChange({ ...range, to: event.target.value })} /></label></div>
}

export function MetricCard({ label, metric, format }: { label: string; metric: Metric<number>; format: (value: number) => string }) {
  return <article className="content-panel metric-card"><div className="metric-title">{label}<MetricStatus status={metric.status} /></div>{metric.status === 'AVAILABLE' && metric.value !== null ? <strong className="metric-value">{format(metric.value)}</strong> : <strong className="metric-value metric-dash">—</strong>}{metric.reason && <p className="metric-reason">{metric.reason}</p>}</article>
}

export function MetricStatus({ status }: { status: string }) {
  const kind = status === 'AVAILABLE' ? '' : status === 'INCOMPLETE' ? ' status-warning' : ' status-muted'
  return <span className={`status-tag${kind}`}>{status.toLowerCase()}</span>
}

function DashboardActions({ preset, range, exporting, onPreset, onOpenCustom, onRangeChange, onApplyCustom, onExport }: { preset: DashboardPreset | 'CUSTOM'; range: { from: string; to: string }; exporting: boolean; onPreset: (preset: DashboardPreset) => void; onOpenCustom: () => void; onRangeChange: (range: { from: string; to: string }) => void; onApplyCustom: () => void; onExport: () => void }) {
  const presets: DashboardPreset[] = ['7D', '30D', 'QTD', 'YTD']
  return <div className="flex flex-wrap items-center gap-2">
    <div className="inline-flex rounded-xl border border-border bg-muted/60 p-1" aria-label="Dashboard date range">
      {presets.map((item) => <button key={item} type="button" aria-pressed={preset === item} onClick={() => onPreset(item)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${preset === item ? 'bg-surface text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'}`}>{item}</button>)}
      <button type="button" aria-pressed={preset === 'CUSTOM'} onClick={onOpenCustom} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${preset === 'CUSTOM' ? 'bg-surface text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'}`}>Custom</button>
    </div>
    {preset === 'CUSTOM' && <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-2">
      <DateRange range={range} onChange={onRangeChange} />
      <Button onClick={onApplyCustom} disabled={!validRange(range.from, range.to)}>Apply</Button>
      <span className="w-full px-1 text-xs text-muted-foreground">Choose dates covered by your imported sales, then apply to recalculate.</span>
    </div>}
    <Button variant="secondary" onClick={onExport} disabled={exporting} aria-label="Export dashboard analytics"><Download />{exporting ? 'Exporting…' : 'Export'}</Button>
  </div>
}

export function ActivityLine({ event }: { event: ActivityEvent }) {
  return <li className="activity-line"><span className="activity-dot" aria-hidden="true" /><div><p>{event.summary}</p><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time></div><span className="activity-action">{event.action.replaceAll('_', ' ').toLowerCase()}</span></li>
}

export function TrendChart({ values, currency }: { values: { date: string; salesAmount: number }[]; currency: string | null }) {
  const width = 680, height = 210, inset = 20
  const amounts = values.map((item) => item.salesAmount)
  const min = Math.min(0, ...amounts), max = Math.max(1, ...amounts)
  const points = values.map((item, index) => {
    const x = inset + index * (width - inset * 2) / Math.max(values.length - 1, 1)
    const y = height - inset - ((item.salesAmount - min) / Math.max(max - min, 1)) * (height - inset * 2)
    return `${x},${y}`
  }).join(' ')
  const accessible = values.map((item) => `${item.date}: ${money(item.salesAmount, currency)}`).join('; ')
  return <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Daily imported sales trend. ${accessible}`} className="trend-chart"><line x1={inset} y1={height - inset} x2={width - inset} y2={height - inset} className="chart-axis"/><polyline points={points} className="chart-line" fill="none" />{values.length <= 31 && values.map((item, index) => { const x = inset + index * (width - inset * 2) / Math.max(values.length - 1, 1); const y = height - inset - ((item.salesAmount - min) / Math.max(max - min, 1)) * (height - inset * 2); return <circle key={item.date} cx={x} cy={y} r="3.5" className="chart-point"><title>{item.date}: {money(item.salesAmount, currency)}</title></circle> })}</svg><div className="chart-edge-labels"><span>{values[0]?.date}</span><span>{values.at(-1)?.date}</span></div></div>
}

function validRange(from: string, to: string) { const first = Date.parse(from + 'T00:00:00Z'); const last = Date.parse(to + 'T00:00:00Z'); return Number.isFinite(first) && Number.isFinite(last) && last >= first && (last - first) / 86400000 + 1 <= 366 }
function formatDateRangeLabel(from: string, to: string) {
  const format = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
  return `${format(from)} – ${format(to)}`
}
function money(value: number, currency: string | null) { return currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) : value.toLocaleString(undefined, { maximumFractionDigits: 2 }) }
function errorText(error: unknown) { return error instanceof Error ? error.message : 'Could not load overview data.' }
