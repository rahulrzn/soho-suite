import { describe, expect, it } from 'vitest'
import { getSharedAnalyticsReason } from './analyticsPresentation'

describe('getSharedAnalyticsReason', () => {
  it('surfaces a backend explanation once when metrics repeat the same gap', () => {
    const metrics = [
      { status: 'UNAVAILABLE', reason: 'No order-line rows exist in the selected date range.' },
      { status: 'UNAVAILABLE', reason: 'No order-line rows exist in the selected date range.' },
      { status: 'AVAILABLE', reason: null },
    ]
    expect(getSharedAnalyticsReason(metrics)).toBe('No order-line rows exist in the selected date range.')
  })

  it('deduplicates equivalent reasons across a metric and its chart', () => {
    expect(getSharedAnalyticsReason(
      [{ status: 'INCOMPLETE', reason: 'Missing dates.' }],
      { status: 'UNAVAILABLE', reason: 'missing dates.' },
    )).toBe('Missing dates.')
  })

  it('leaves unique metric explanations local', () => {
    expect(getSharedAnalyticsReason([
      { status: 'UNAVAILABLE', reason: 'Missing dates.' },
      { status: 'UNAVAILABLE', reason: 'No customers mapped.' },
    ])).toBeNull()
  })
})
