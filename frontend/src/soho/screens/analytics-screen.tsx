import type { ReactNode } from 'react'
import { Download } from 'lucide-react'

import { Button } from '../components/button'
import { PageHeader } from '../components/misc'
import { Panel, PanelBody, PanelHeader } from '../components/panel'
import { EmptyState } from '../components/states'
import { MetricStatus, TrendChart } from '../../features/OverviewPage'
import { LoadingLine } from '../../components/Feedback'
import { isAnalyticsReasonShared } from '../../features/analyticsPresentation'

export interface AnalyticsScreenProps {
  businessName: string
  dateLabel: string
  currency: string | null
  metrics: { id: string; label: string; value: string | null; status: string; reason: string | null }[]
  dailyTrend: { status: string; value: { date: string; salesAmount: number }[] | null; reason: string | null }
  sharedDataReason: string | null
  loading?: boolean
  rangeControl: ReactNode
  exportBusy: boolean
  onExport: () => void
}

export function AnalyticsScreen({ businessName, dateLabel, currency, metrics, dailyTrend, sharedDataReason, loading = false, rangeControl, exportBusy, onExport }: AnalyticsScreenProps) {
  const header = <PageHeader eyebrow="Analytics" title="Sales performance" description={`Supported sales metrics from ${businessName}'s mapped dataset.`} actions={<div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-end">{rangeControl}<Button className="w-full sm:w-auto" variant="primary" disabled={exportBusy} onClick={onExport}><Download />{exportBusy ? 'Preparing CSV…' : 'Export CSV'}</Button></div>} />
  return <div className="space-y-6">
    {header}
    {loading ? <section className="content-panel panel-pad" role="status"><LoadingLine text="Loading analytics for the selected date range…" /></section> : <>
      {sharedDataReason && <p className="analytics-shared-reason" role="status">{sharedDataReason}</p>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Sales metrics">
      {metrics.map((metric) => <article key={metric.id} className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-muted-foreground">{metric.label}</p>{metric.status !== 'AVAILABLE' && <MetricStatus status={metric.status} />}</div>
        <p className="num mt-2 text-2xl font-semibold text-foreground">{metric.value ?? '—'}</p>
        {metric.reason && !isAnalyticsReasonShared(metric.reason, sharedDataReason) && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{metric.reason}</p>}
      </article>)}
    </section>
      <Panel>
      <PanelHeader eyebrow="Daily trend" title="Imported sales by date" description={`${dateLabel}${currency ? ` · ${currency}` : ''}`} actions={dailyTrend.status !== 'AVAILABLE' && <MetricStatus status={dailyTrend.status} />} />
      <PanelBody>
        {dailyTrend.status === 'AVAILABLE' && dailyTrend.value?.length ? <TrendChart values={dailyTrend.value} currency={currency} /> : <EmptyState title="Sales trend unavailable" description={isAnalyticsReasonShared(dailyTrend.reason, sharedDataReason) ? 'See the data availability note above.' : dailyTrend.reason ?? 'The backend returned no daily sales for this range.'} />}
      </PanelBody>
      </Panel>
    </>}
  </div>
}
