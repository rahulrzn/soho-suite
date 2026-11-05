import { describe, expect, it } from 'vitest'
import type { AnalyticsOverview, HealthScore } from '../api/models'
import { buildDashboardPresentation } from './dashboardPresentation'

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
      { label: 'Revenue', value: 1250, delta: null },
      { label: 'Orders', value: null, delta: null },
      { label: 'Average order value', value: 625, delta: null },
      { label: 'Customers', value: null, delta: null },
    ])
    expect(result.trend).toEqual([{ label: '2026-10-01', revenue: 1250 }])
    expect(result.insights).toEqual([])
    expect(result.stockAlerts).toEqual([])
  })

  it('consolidates repeated KPI reasons while preserving distinct missing-data reasons and real zero values', () => {
    const analytics: AnalyticsOverview = {
      datasetId: 7, datasetName: 'Orders', from: '2026-10-01', to: '2026-10-30', currency: 'INR',
      totalSalesAmount: { status: 'AVAILABLE', value: 0, reason: null },
      distinctOrderCount: { status: 'UNAVAILABLE', value: null, reason: 'No order rows in this period.' },
      averageOrderValue: { status: 'INCOMPLETE', value: null, reason: 'Order amounts are missing.' },
      distinctCustomerCount: { status: 'UNAVAILABLE', value: null, reason: 'No order rows in this period.' },
      dailySalesTrend: unavailable, salesChangePercent: unavailable,
    }

    const result = buildDashboardPresentation(analytics, null)

    expect(result.kpis[0].value).toBe(0)
    expect(result.salesAvailability).toEqual({
      kind: 'incomplete',
      reasons: ['No order rows in this period.', 'Order amounts are missing.'],
    })
    expect(result.kpis.every((metric) => metric.reason === undefined)).toBe(true)
  })

  it('does not call a data source missing when the backend returns real metrics without an id', () => {
    const analytics: AnalyticsOverview = {
      datasetId: null, datasetName: null, from: '2026-10-01', to: '2026-10-30', currency: 'INR',
      totalSalesAmount: { status: 'AVAILABLE', value: 0, reason: null },
      distinctOrderCount: { status: 'AVAILABLE', value: 0, reason: null },
      averageOrderValue: { status: 'AVAILABLE', value: 0, reason: null },
      distinctCustomerCount: { status: 'AVAILABLE', value: 0, reason: null },
      dailySalesTrend: { status: 'AVAILABLE', value: [], reason: null },
      salesChangePercent: unavailable,
    }

    expect(buildDashboardPresentation(analytics, null).salesAvailability.kind).toBe('available')
  })

  it('keeps backend data freshness separate from business health factors', () => {
    const health: HealthScore = {
      status: 'AVAILABLE', score: 75, currency: 'INR', from: '2026-10-01', to: '2026-10-30',
      components: [
        { name: 'profitability', weightPercent: 50, inputStatus: 'AVAILABLE', score: 70, formula: 'margin', reason: null },
        { name: 'dataFreshness', weightPercent: 0, inputStatus: 'AVAILABLE', score: 100, formula: 'age', reason: 'The dataset was imported 1 day ago.' },
      ],
      interpretation: 'Healthy.', limitations: 'Estimate only.',
    }

    const result = buildDashboardPresentation(null, health)

    expect(result.healthFactors.map((factor) => factor.label)).toEqual(['Operating margin'])
    expect(result.dataFreshness).toEqual({
      label: 'Data freshness', score: 100, note: 'The dataset was imported 1 day ago.', status: 'AVAILABLE',
    })
  })

  it('does not display an unavailable health score as a numeric score', () => {
    const health: HealthScore = {
      status: 'INSUFFICIENT_DATA', score: null, currency: null, from: '2026-10-01', to: '2026-10-30',
      components: [], interpretation: 'More comparison data is needed.', limitations: 'Only imported data is used.',
    }
    expect(buildDashboardPresentation(null, health).health).toBeNull()
  })

  it('preserves the backend reason when a score cannot be calculated', () => {
    const health: HealthScore = {
      status: 'INSUFFICIENT_DATA', score: null, currency: null, from: '2026-10-01', to: '2026-10-30',
      components: [{ name: 'salesChange', weightPercent: 100, inputStatus: 'INCOMPLETE', score: null, formula: 'documented formula', reason: 'Imported rows have invalid dates.' }],
      interpretation: 'A score is unavailable.', limitations: 'Only imported data is used.',
    }
    expect(buildDashboardPresentation(null, health).healthUnavailableReason).toBe('Imported rows have invalid dates.')
  })

  it('labels the real backend score and its sales growth component for the dashboard', () => {
    const health: HealthScore = {
      status: 'AVAILABLE', score: 75, currency: 'INR', from: '2026-10-01', to: '2026-10-30',
      components: [{ name: 'salesChange', weightPercent: 100, inputStatus: 'AVAILABLE', score: 75, formula: 'clamp(50 + change, 0, 100)', reason: 'Sales increased by 25 percent.' }],
      interpretation: 'Imported sales increased.', limitations: 'This is a sales indicator.',
    }
    const result = buildDashboardPresentation(null, health).health
    expect(result?.band).toBe('Healthy')
    expect(result?.factors?.[0]?.label).toBe('Revenue growth')
  })
})
