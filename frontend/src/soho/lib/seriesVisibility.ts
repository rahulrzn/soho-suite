export type SeriesKey = { key: string }

export function getVisibleSeriesKeys(series: readonly SeriesKey[], hiddenKeys: readonly string[]): string[] {
  return series.filter(({ key }) => !hiddenKeys.includes(key)).map(({ key }) => key)
}

export function toggleHiddenSeries(
  hiddenKeys: readonly string[],
  series: readonly SeriesKey[],
  key: string,
): string[] {
  if (hiddenKeys.includes(key)) return hiddenKeys.filter((hiddenKey) => hiddenKey !== key)

  const visibleCount = series.filter(({ key: seriesKey }) => !hiddenKeys.includes(seriesKey)).length
  return visibleCount > 1 ? [...hiddenKeys, key] : [...hiddenKeys]
}
