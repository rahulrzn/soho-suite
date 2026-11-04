import { describe, expect, it } from 'vitest'
import type { AnalyticsOverview, HealthScore } from '../api/models'
import { buildDashboardPresentation } from './dashboardMockupPresentation'

const unavailable = { status: 'UNAVAILABLE' as const, value: null, reason: 'No mapped data' }

describe('buildDashboardPresentation', () => {
  it('uses only metrics and trend points returned as available by the backend', () => {
    const analytics: AnalyticsOverview = {
      datasetId: 7, datasetName: 'Orders', from: '2026-10-01', to: '2026-10-30', currency: 'INR',
      totalSalesAmount: { status: 'AVAILABLE', value: 1250, reason: null },
      distinctOrderCount: unavailable,
      averageOrderValue: { status: 'AVAILABLE', value: 625, reason: null },
      distinctCustomerCount: unavailable,
      dailySalesTrend: { status: 'AVAILABLE', value: [{ date: '2026-10-01', salesAmount: 1250 }], reason: null },
      salesChangePercent: { status: 'UNAVAILABLE', value: null, reason: 'Insufficient comparison data' },
    }
    const result = buildDashboardPresentation(analytics, null)
    expect(result.kpis.map(({ label, value, delta }) => ({ label, value, delta }))).toEqual([
      { label: 'Imported sales', value: 1250, delta: null },
      { label: 'Orders', value: null, delta: null },
      { label: 'Average order value', value: 625, delta: null },
      { label: 'Customers', value: null, delta: null },
    ])
    expect(result.trend).toEqual([{ label: '2026-10-01', revenue: 1250 }])
    expect(result.insights).toEqual([])
    expect(result.stockAlerts).toEqual([])
  })

  it('does not display an unavailable health score as a numeric score', () => {
    const health: HealthScore = {
      status: 'INSUFFICIENT_DATA', score: null, currency: null, from: '2026-10-01', to: '2026-10-30',
      components: [], interpretation: 'More comparison data is needed.', limitations: 'Only imported data is used.',
    }
    expect(buildDashboardPresentation(null, health).health).toBeNull()
  })
})
