import { describe, expect, it } from 'vitest'
import { getVisibleSeriesKeys, toggleHiddenSeries } from './seriesVisibility'

describe('series visibility', () => {
  const series = [{ key: 'revenue' }, { key: 'expenses' }]

  it('shows all current series by default, including series added later', () => {
    expect(getVisibleSeriesKeys([...series, { key: 'orders' }], [])).toEqual([
      'revenue', 'expenses', 'orders',
    ])
  })

  it('allows hiding a series but keeps at least one visible', () => {
    const hidden = toggleHiddenSeries([], series, 'revenue')
    expect(getVisibleSeriesKeys(series, hidden)).toEqual(['expenses'])
    expect(toggleHiddenSeries(hidden, series, 'expenses')).toEqual(hidden)
  })

  it('restores a hidden series when toggled back on', () => {
    const hidden = toggleHiddenSeries([], series, 'revenue')
    expect(getVisibleSeriesKeys(series, toggleHiddenSeries(hidden, series, 'revenue'))).toEqual([
      'revenue', 'expenses',
    ])
  })
})
