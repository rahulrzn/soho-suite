export function hasAnalyticsSource(analytics: { datasetId: number | null } | null): boolean {
  return analytics?.datasetId != null
}
