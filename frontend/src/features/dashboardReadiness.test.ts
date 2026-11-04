import { describe, expect, it } from 'vitest'
import { hasAnalyticsSource } from './dashboardReadiness'

describe('hasAnalyticsSource', () => {
  it('shows setup when the backend has no configured dataset', () => {
    expect(hasAnalyticsSource(null)).toBe(false)
    expect(hasAnalyticsSource({ datasetId: null })).toBe(false)
  })

  it('treats a configured dataset as the source even when metrics are unavailable', () => {
    expect(hasAnalyticsSource({ datasetId: 8 })).toBe(true)
  })
})
