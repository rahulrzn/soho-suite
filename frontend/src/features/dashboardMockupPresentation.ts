import type { AnalyticsOverview, HealthScore } from '../api/models'
import type { CategoryValue, DashboardActivityEvent, HealthScore as MockHealthScore, Insight, Kpi, TrendPoint } from '../soho/types'

export type DashboardPresentation = {
  kpis: Kpi[]
  trend: TrendPoint[]
  health: MockHealthScore | null
  insights: Insight[]
  topCategories: CategoryValue[]
  stockAlerts: []
  recentActivity: DashboardActivityEvent[]
}

export function buildDashboardPresentation(analytics: AnalyticsOverview | null, health: HealthScore | null, events: import('../api/models').ActivityEvent[] = []): DashboardPresentation {
  const metricKpis: Kpi[] = analytics ? [
    fromMetric('revenue', 'Imported sales', analytics.totalSalesAmount, 'currency', analytics.currency),
    fromMetric('orders', 'Orders', analytics.distinctOrderCount, 'number'),
    fromMetric('aov', 'Average order value', analytics.averageOrderValue, 'currency', analytics.currency),
    fromMetric('customers', 'Customers', analytics.distinctCustomerCount, 'number'),
  ] : []
  const salesChange = analytics?.salesChangePercent.status === 'AVAILABLE' ? analytics.salesChangePercent.value : null
  if (metricKpis[0] && salesChange !== null) metricKpis[0].delta = salesChange
  const trend = analytics?.dailySalesTrend.status === 'AVAILABLE'
    ? (analytics.dailySalesTrend.value ?? []).map((point) => ({ label: point.date, revenue: point.salesAmount }))
    : []
  const score = health?.status === 'AVAILABLE' && health.score !== null ? health : null
  const mappedHealth: MockHealthScore | null = score ? {
    score: score.score!,
    summary: score.interpretation,
    factors: score.components.filter((part) => part.score !== null).map((part) => ({
      label: part.name,
      score: part.score!,
      weight: part.weightPercent / 100,
      note: part.reason ?? part.formula,
    })),
  } : null
  return {
    kpis: metricKpis,
    trend,
    health: mappedHealth,
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

function fromMetric(id: string, label: string, metric: { status: string; value: number | null; reason: string | null }, format: Kpi['format'], currency?: string | null): Kpi {
  return {
    id, label, value: metric.status === 'AVAILABLE' ? metric.value : null,
    format, delta: null, goodWhen: 'up', spark: [],
    caption: currency && format === 'currency' ? currency : undefined,
    reason: metric.reason ?? undefined,
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
