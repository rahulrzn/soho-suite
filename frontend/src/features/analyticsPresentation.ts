type Availability = { status: string; reason: string | null }

/** Return one reason only when the backend repeats the same data gap across the view. */
export function getSharedAnalyticsReason(metrics: Availability[], dailyTrend?: Availability | null): string | null {
  const reasons = [...metrics, ...(dailyTrend ? [dailyTrend] : [])]
    .filter((metric) => metric.status !== 'AVAILABLE' && metric.reason?.trim())
    .map((metric) => metric.reason!.trim())
  const counts = new Map<string, { count: number; text: string }>()
  for (const text of reasons) {
    const key = text.toLocaleLowerCase()
    const current = counts.get(key)
    counts.set(key, { count: (current?.count ?? 0) + 1, text: current?.text ?? text })
  }
  return [...counts.values()].find((entry) => entry.count > 1)?.text ?? null
}

export function isAnalyticsReasonShared(reason: string | null | undefined, sharedReason: string | null) {
  return Boolean(reason && sharedReason && reason.trim().toLocaleLowerCase() === sharedReason.trim().toLocaleLowerCase())
}
