import type { AnalyticsOverview, HealthScore } from '../api/models'
import type { CategoryValue, DashboardActivityEvent, HealthScore as MockHealthScore, Insight, Kpi, TrendPoint } from '../soho/types'

export type DashboardPresentation = {
  kpis: Kpi[]
  trend: TrendPoint[]
  health: MockHealthScore | null
  healthUnavailableReason: string | null
  healthFactors: { label: string; score: number | null; note: string; status: string }[]
  dataFreshness: { label: string; score: number | null; note: string; status: string } | null
  salesAvailability: { kind: 'available' | 'unavailable' | 'incomplete' | 'no-dataset'; reasons: string[] }
  insights: Insight[]
  topCategories: CategoryValue[]
  stockAlerts: []
  recentActivity: DashboardActivityEvent[]
}

export function buildDashboardPresentation(analytics: AnalyticsOverview | null, health: HealthScore | null, events: import('../api/models').ActivityEvent[] = []): DashboardPresentation {
  const notAvailable = { status: 'UNAVAILABLE' as const, value: null, reason: null }
  const metricDefinitions: [string, string, AnalyticsOverview[keyof Pick<AnalyticsOverview, 'totalSalesAmount' | 'distinctOrderCount' | 'averageOrderValue' | 'distinctCustomerCount'>], Kpi['format'], string | null | undefined][] = [
    ['revenue', 'Revenue', analytics?.totalSalesAmount ?? notAvailable, 'currency', analytics?.currency],
    ['orders', 'Orders', analytics?.distinctOrderCount ?? notAvailable, 'number', undefined],
    ['aov', 'Average order value', analytics?.averageOrderValue ?? notAvailable, 'currency', analytics?.currency],
    ['customers', 'Customers', analytics?.distinctCustomerCount ?? notAvailable, 'number', undefined],
  ]
  const metricKpis: Kpi[] = metricDefinitions.map(([id, label, metric, format, currency]) =>
    fromMetric(id, label, metric, format, currency),
  )
  const nonAvailableMetrics = metricDefinitions.filter(([, , metric]) => metric.status !== 'AVAILABLE')
  const reasons = [...new Set(nonAvailableMetrics.map(([, , metric]) => metric.reason?.trim()).filter((reason): reason is string => Boolean(reason)))]
  const salesAvailability: DashboardPresentation['salesAvailability'] = nonAvailableMetrics.length === 0
    ? { kind: 'available', reasons: [] }
    : analytics?.datasetId == null
      ? { kind: 'no-dataset', reasons }
      : { kind: nonAvailableMetrics.some(([, , metric]) => metric.status === 'INCOMPLETE') ? 'incomplete' : 'unavailable', reasons }
  const salesChange = analytics?.salesChangePercent.status === 'AVAILABLE' ? analytics.salesChangePercent.value : null
  if (metricKpis[0] && salesChange !== null) metricKpis[0].delta = salesChange
  const trend = analytics?.dailySalesTrend.status === 'AVAILABLE'
    ? (analytics.dailySalesTrend.value ?? []).map((point) => ({ label: point.date, revenue: point.salesAmount }))
    : []
  const score = health?.status === 'AVAILABLE' && health.score !== null ? health : null
  const mappedHealth: MockHealthScore | null = score ? {
    score: score.score!,
    band: bandFor(score.score!),
    summary: score.interpretation,
    factors: score.components.filter((part) => part.score !== null && part.name !== 'dataFreshness').map((part) => ({
      label: healthFactorLabel(part.name),
      score: part.score!,
      weight: part.weightPercent / 100,
      note: part.reason ?? part.formula,
    })),
  } : null
  const dataFreshnessPart = health?.components.find((part) => part.name === 'dataFreshness')
  const dataFreshness = dataFreshnessPart ? {
    label: 'Data freshness',
    score: dataFreshnessPart.score,
    note: dataFreshnessPart.reason ?? 'Import timing details are not available from this response.',
    status: dataFreshnessPart.inputStatus,
  } : null
  const healthFactors = health?.components.filter((part) => part.name !== 'dataFreshness').map((part) => ({
    label: healthFactorLabel(part.name),
    score: part.score,
    note: part.reason ?? (part.inputStatus === 'AVAILABLE' ? 'Included in the health estimate.' : part.inputStatus.toLowerCase().replaceAll('_', ' ')),
    status: part.inputStatus,
  })) ?? []
  return {
    kpis: metricKpis,
    trend,
    health: mappedHealth,
    healthFactors,
    dataFreshness,
    salesAvailability,
    healthUnavailableReason: mappedHealth ? null : health?.components.find((part) => part.inputStatus !== 'AVAILABLE' && part.reason)?.reason
      ?? health?.interpretation
      ?? 'A health score is not available for this date range yet.',
    insights: [],
    topCategories: [],
    stockAlerts: [],
    recentActivity: events.map((event) => ({
      id: String(event.id),
      actor: event.actorUserId === null ? 'Unknown member' : `User ${event.actorUserId}`,
      actorInitials: event.actorUserId === null ? '?' : 'U',
      action: event.summary,
      target: '',
      module: moduleFor(event.action),
      day: new Date(event.occurredAt).toLocaleDateString(),
      time: new Date(event.occurredAt).toLocaleTimeString(),
      detail: event.action.toLowerCase().replaceAll('_', ' '),
    })),
  }
}

function bandFor(score: number): NonNullable<MockHealthScore['band']> {
  if (score >= 80) return 'Thriving'
  if (score >= 60) return 'Healthy'
  if (score >= 40) return 'Watch'
  return 'At risk'
}

function healthFactorLabel(name: string) {
  const labels: Record<string, string> = {
    profitability: 'Operating margin',
    revenueGrowth: 'Revenue growth',
    salesChange: 'Revenue growth',
    cashFlow: 'Cash flow',
    inventoryTurnover: 'Inventory turnover',
    dataFreshness: 'Data freshness',
  }
  return labels[name] ?? name
}

function fromMetric(id: string, label: string, metric: { status: string; value: number | null; reason: string | null }, format: Kpi['format'], currency?: string | null): Kpi {
  return {
    id, label, value: metric.status === 'AVAILABLE' ? metric.value : null,
    format, delta: null, goodWhen: 'up', spark: [],
    caption: currency && format === 'currency' ? currency : undefined,
  }
}

function moduleFor(action: string): DashboardActivityEvent['module'] {
  const value = action.toLowerCase()
  if (value.includes('dataset')) return 'Datasets'
  if (value.includes('expense')) return 'Expenses'
  if (value.includes('inventory') || value.includes('stock')) return 'Inventory'
  if (value.includes('report') || value.includes('export')) return 'Reports'
  if (value.includes('member') || value.includes('invitation')) return 'Team'
  return 'Settings'
}
