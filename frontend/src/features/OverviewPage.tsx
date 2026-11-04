/* eslint-disable react-hooks/set-state-in-effect -- The effect loads overview data when its date range changes. */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { getAnalyticsOverview, getHealthScore } from '../api/analyticsApi'
import { getActivity } from '../api/activityApi'
import type { ActivityEvent, AnalyticsOverview, HealthScore, Metric } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { RouteLink } from '../app/navigation'
import { EmptyState, LoadingLine } from '../components/Feedback'
import type { PageCallbacks } from './types'
import { hasAnalyticsSource } from './dashboardReadiness'
import { buildDashboardPresentation } from './dashboardMockupPresentation'

const DashboardScreen = lazy(() => import('../soho/screens/dashboard-screen').then(({ DashboardScreen: screen }) => ({ default: screen })))

export function OverviewPage({ onError }: PageCallbacks) {
  const { business, profile } = useWorkspace()
  const [range, setRange] = useState(() => defaultRange())
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null)
  const [score, setScore] = useState<HealthScore | null>(null)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [busy, setBusy] = useState(true)
  const [refresh, setRefresh] = useState(0)

  const reloadData = useCallback(async () => {
    if (!validRange(range.from, range.to)) {
      onError('Choose a valid date range of no more than 366 days.')
      setBusy(false)
      return
    }
    setBusy(true)
    const [overviewResult, scoreResult, activityResult] = await Promise.allSettled([
      getAnalyticsOverview(business.id, range.from, range.to),
      getHealthScore(business.id, range.from, range.to),
      getActivity(business.id, 0, 5),
    ])
    const failures: string[] = []
    if (overviewResult.status === 'fulfilled') setAnalytics(overviewResult.value)
    else { setAnalytics(null); failures.push(errorText(overviewResult.reason)) }
    if (scoreResult.status === 'fulfilled') setScore(scoreResult.value)
    else { setScore(null); failures.push(errorText(scoreResult.reason)) }
    if (activityResult.status === 'fulfilled') setActivity(activityResult.value.items)
    else { setActivity([]); failures.push(errorText(activityResult.reason)) }
    if (failures.length) onError([...new Set(failures)].join(' '))
    setBusy(false)
  }, [business.id, range.from, range.to, onError])

  useEffect(() => { void reloadData() }, [reloadData, refresh])

  const analyticsConfigured = hasAnalyticsSource(analytics)
  const dashboard = buildDashboardPresentation(analytics, score, activity)

  return <div className="feature-stack">
    {busy && <LoadingLine text="Refreshing this workspace’s real data…" />}
    {analyticsConfigured ? <Suspense fallback={<LoadingLine text="Opening dashboard…" />}><DashboardScreen
      userFirstName={profile.firstName}
      businessName={business.tradingName || business.company}
      dateLabel={range.from + ' to ' + range.to}
      health={dashboard.health}
      kpis={dashboard.kpis}
      revenueTrend={dashboard.trend}
      insights={dashboard.insights}
      topCategories={dashboard.topCategories}
      stockAlerts={dashboard.stockAlerts}
      recentActivity={dashboard.recentActivity}
      rangeControl={<DateRange range={range} onChange={setRange} />}
    /></Suspense> : !busy && analytics && <section className="analytics-setup-state">
      <div className="setup-mark" aria-hidden="true">↗</div><div><p className="section-label">START WITH YOUR DATA</p><h2>Connect a dataset to see your sales picture.</h2><p>Choose a confirmed import and map its date, amount, and order columns. Soho Suite will show only the metrics supported by those rows.</p></div><RouteLink className="button-primary" to="/analytics">Set up analytics</RouteLink>
    </section>}

    {!busy && !analytics && <section className="content-panel panel-pad"><EmptyState title="Overview could not be loaded" description="The backend did not return sales data. Check the request status and refresh this page." /></section>}
    <button type="button" className="button-quiet refresh-button" onClick={() => setRefresh((current) => current + 1)} disabled={busy}>Refresh overview</button>
  </div>
}

export function MetricCard({ label, metric, format }: { label: string; metric: Metric<number>; format: (value: number) => string }) {
  return <article className="content-panel metric-card"><div className="metric-title">{label}<MetricStatus status={metric.status} /></div>{metric.status === 'AVAILABLE' && metric.value !== null ? <strong className="metric-value">{format(metric.value)}</strong> : <strong className="metric-value metric-dash">—</strong>}{metric.reason && <p className="metric-reason">{metric.reason}</p>}</article>
}

export function MetricStatus({ status }: { status: string }) {
  const kind = status === 'AVAILABLE' ? '' : status === 'INCOMPLETE' ? ' status-warning' : ' status-muted'
  return <span className={`status-tag${kind}`}>{status.toLowerCase()}</span>
}

export function DateRange({ range, onChange }: { range: { from: string; to: string }; onChange: (range: { from: string; to: string }) => void }) {
  return <div className="date-range"><label>From<input type="date" value={range.from} max={range.to} onChange={(event) => onChange({ ...range, from: event.target.value })} /></label><label>To<input type="date" value={range.to} min={range.from} onChange={(event) => onChange({ ...range, to: event.target.value })} /></label></div>
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

function defaultRange() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 29)
  return { from: localDate(from), to: localDate(to) }
}
function validRange(from: string, to: string) { const first = Date.parse(from + 'T00:00:00Z'); const last = Date.parse(to + 'T00:00:00Z'); return Number.isFinite(first) && Number.isFinite(last) && last >= first && (last - first) / 86400000 + 1 <= 366 }
function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function money(value: number, currency: string | null) { return currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value) : value.toLocaleString(undefined, { maximumFractionDigits: 2 }) }
function errorText(error: unknown) { return error instanceof Error ? error.message : 'Could not load overview data.' }
