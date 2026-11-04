/* eslint-disable react-hooks/set-state-in-effect -- The effect loads overview data when its date range changes. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAnalyticsOverview, getHealthScore } from '../api/analyticsApi'
import { getActivity } from '../api/activityApi'
import type { ActivityEvent, AnalyticsOverview, HealthScore, Metric } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { RouteLink } from '../app/navigation'
import { EmptyState, LoadingLine } from '../components/Feedback'
import type { PageCallbacks } from './types'
import { hasAnalyticsSource } from './dashboardReadiness'

export function OverviewPage({ onError }: PageCallbacks) {
  const { business } = useWorkspace()
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

  const metrics = useMemo(() => analytics ? [
    { label: 'Imported sales', metric: analytics.totalSalesAmount, format: (value: number) => money(value, analytics.currency) },
    { label: 'Orders', metric: analytics.distinctOrderCount, format: integer },
    { label: 'Average order value', metric: analytics.averageOrderValue, format: (value: number) => money(value, analytics.currency) },
    { label: 'Customers', metric: analytics.distinctCustomerCount, format: integer },
  ] : [], [analytics])
  const analyticsConfigured = hasAnalyticsSource(analytics)

  return <div className="feature-stack">
    <section className="overview-banner">
      <div><p className="section-label">YOUR BUSINESS AT A GLANCE</p><h2>Make sense of what’s moving.</h2><p>Sales figures come from the dataset mapped for this business. Use them as an operational view, not accounting revenue.</p></div>
      <DateRange range={range} onChange={setRange} />
    </section>
    {busy && <LoadingLine text="Refreshing this workspace’s real data…" />}
    {analyticsConfigured ? <div className="metric-grid dashboard-metrics">
      {metrics.map(({ label, metric, format }) => <MetricCard key={label} label={label} metric={metric} format={format} />)}
    </div> : !busy && analytics && <section className="analytics-setup-state">
      <div className="setup-mark" aria-hidden="true">↗</div><div><p className="section-label">START WITH YOUR DATA</p><h2>Connect a dataset to see your sales picture.</h2><p>Choose a confirmed import and map its date, amount, and order columns. Soho Suite will show only the metrics supported by those rows.</p></div><RouteLink className="button-primary" to="/analytics">Set up analytics</RouteLink>
    </section>}

    {analyticsConfigured && <div className="overview-grid">
      <section className="content-panel panel-pad trend-panel">
        <div className="panel-heading"><div><p className="section-label">SALES PATTERN</p><h2>Daily sales</h2><p>{range.from} to {range.to}{analytics?.currency ? ` · ${analytics.currency}` : ''}</p></div>{analytics?.dailySalesTrend.status && <MetricStatus status={analytics.dailySalesTrend.status} />}</div>
        {analytics?.dailySalesTrend.status === 'AVAILABLE' && analytics.dailySalesTrend.value?.length ? <TrendChart values={analytics.dailySalesTrend.value} currency={analytics.currency} />
          : <EmptyState title={analytics?.dailySalesTrend.reason ? 'Trend unavailable' : 'No trend to show'} description={analytics?.dailySalesTrend.reason ?? 'Once analytics are configured and there is data in this period, daily sales will appear here.'} />}
        <p className="data-footnote">This reflects mapped rows in the imported dataset. A zero on a date is not proof that no real-world sales occurred.</p>
      </section>

      <section className="content-panel panel-pad score-panel">
        <div className="panel-heading"><div><p className="section-label">BUSINESS HEALTH SCORE</p><h2>Sales direction</h2></div><span className="score-info" aria-hidden="true">i</span></div>
        {busy && !score ? <LoadingLine text="Checking score availability…" /> : score?.status === 'AVAILABLE' && score.score !== null ? <div className="score-value"><strong>{score.score}</strong><span>/ 100</span><p>{score.interpretation}</p></div>
          : <div className="score-empty"><span className="score-placeholder">—</span><strong>Not enough comparable data</strong><p>{score?.interpretation || 'A score appears when the backend can compare sales in this period with the immediately preceding period.'}</p></div>}
        {score?.components?.length ? <details className="score-method"><summary>How this indicator is calculated</summary>{score.components.map((part) => <div key={part.name}><strong>{part.name}</strong><span>{part.weightPercent}% of the score · {part.inputStatus.toLowerCase()}</span><p>{part.formula}</p>{part.reason && <small>{part.reason}</small>}</div>)}</details> : null}
        {score?.limitations && <p className="score-limitation">{score.limitations}</p>}
      </section>
    </div>}

    <section className="content-panel panel-pad activity-preview">
      <div className="panel-heading"><div><p className="section-label">WORKSPACE HISTORY</p><h2>Recent activity</h2></div><RouteLink className="button-quiet" to="/activity">See all activity <span aria-hidden="true">→</span></RouteLink></div>
      {activity.length ? <ol className="activity-list">{activity.map((event) => <ActivityLine key={event.id} event={event} />)}</ol> : <EmptyState title={busy ? 'Loading activity' : 'No activity recorded yet'} description={busy ? 'Checking your business history.' : 'When your team changes business data, events supported by the backend will appear here.'} />}
    </section>
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

function TrendChart({ values, currency }: { values: { date: string; salesAmount: number }[]; currency: string | null }) {
  const width = 680, height = 210, inset = 20
  const amounts = values.map((item) => item.salesAmount)
  const min = Math.min(0, ...amounts), max = Math.max(1, ...amounts)
  const points = values.map((item, index) => {
    const x = inset + index * (width - inset * 2) / Math.max(values.length - 1, 1)
    const y = height - inset - ((item.salesAmount - min) / (max - min)) * (height - inset * 2)
    return `${x},${y}`
  }).join(' ')
  const accessible = values.map((item) => `${item.date}: ${money(item.salesAmount, currency)}`).join('; ')
  return <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Daily imported sales trend. ${accessible}`} className="trend-chart"><line x1={inset} y1={height - inset} x2={width - inset} y2={height - inset} className="chart-axis"/><polyline points={points} className="chart-line" fill="none" />{values.length <= 31 && values.map((item, index) => { const x = inset + index * (width - inset * 2) / Math.max(values.length - 1, 1); const y = height - inset - ((item.salesAmount - min) / (max - min)) * (height - inset * 2); return <circle key={item.date} cx={x} cy={y} r="3.5" className="chart-point"><title>{item.date}: {money(item.salesAmount, currency)}</title></circle> })}</svg><div className="chart-edge-labels"><span>{values[0]?.date}</span><span>{values.at(-1)?.date}</span></div></div>
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
function integer(value: number) { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value) }
function errorText(error: unknown) { return error instanceof Error ? error.message : 'Could not load overview data.' }
