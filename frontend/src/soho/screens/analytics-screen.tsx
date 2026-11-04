import type { ReactNode } from 'react'
import { Download } from 'lucide-react'

import { Button } from '../components/button'
import { PageHeader } from '../components/misc'
import { Panel, PanelBody, PanelHeader } from '../components/panel'
import { EmptyState } from '../components/states'
import { MetricStatus, TrendChart } from '../../features/OverviewPage'

export interface AnalyticsScreenProps {
  businessName: string
  dateLabel: string
  currency: string | null
  metrics: { id: string; label: string; value: string | null; status: string; reason: string | null }[]
  dailyTrend: { status: string; value: { date: string; salesAmount: number }[] | null; reason: string | null }
  rangeControl: ReactNode
  exportBusy: boolean
  onExport: () => void
}

export function AnalyticsScreen({ businessName, dateLabel, currency, metrics, dailyTrend, rangeControl, exportBusy, onExport }: AnalyticsScreenProps) {
  return <div className="space-y-6 animate-rise">
    <PageHeader eyebrow="Analytics" title="Sales performance" description={`Supported sales metrics from ${businessName}'s mapped dataset.`} actions={<div className="flex flex-wrap items-center gap-2">{rangeControl}<Button variant="primary" disabled={exportBusy} onClick={onExport}><Download />{exportBusy ? 'Preparing CSV…' : 'Export CSV'}</Button></div>} />
    <section className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-soft sm:grid-cols-2 xl:grid-cols-4" aria-label="Sales metrics">
      {metrics.map((metric) => <article key={metric.id} className="bg-surface p-5">
        <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-muted-foreground">{metric.label}</p><MetricStatus status={metric.status} /></div>
        <p className="num mt-2 text-2xl font-semibold text-foreground">{metric.value ?? '—'}</p>
        {metric.reason && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{metric.reason}</p>}
      </article>)}
    </section>
    <Panel>
      <PanelHeader eyebrow="Daily trend" title="Imported sales by date" description={`${dateLabel}${currency ? ` · ${currency}` : ''}`} actions={<MetricStatus status={dailyTrend.status} />} />
      <PanelBody>
        {dailyTrend.status === 'AVAILABLE' && dailyTrend.value?.length ? <TrendChart values={dailyTrend.value} currency={currency} /> : <EmptyState title="Sales trend unavailable" description={dailyTrend.reason ?? 'The backend returned no daily sales for this range.'} />}
      </PanelBody>
    </Panel>
  </div>
}
