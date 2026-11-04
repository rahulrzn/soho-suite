export type AppRoute =
  | { name: 'overview' }
  | { name: 'datasets' }
  | { name: 'dataset-detail'; datasetId: number }
  | { name: 'analytics' }
  | { name: 'activity' }
  | { name: 'reports' }
  | { name: 'expenses' }
  | { name: 'inventory' }
  | { name: 'team' }
  | { name: 'business-settings' }
  | { name: 'profile-settings' }
  | { name: 'invitation-accept' }
  | { name: 'ownership-accept' }
  | { name: 'integration' }
  | { name: 'not-found' }

const exactRoutes: Record<string, AppRoute> = {
  '/': { name: 'overview' },
  '/overview': { name: 'overview' },
  '/datasets': { name: 'datasets' },
  '/analytics': { name: 'analytics' },
  '/activity': { name: 'activity' },
  '/reports': { name: 'reports' },
  '/expenses': { name: 'expenses' },
  '/inventory': { name: 'inventory' },
  '/team': { name: 'team' },
  '/settings/business': { name: 'business-settings' },
  '/settings/profile': { name: 'profile-settings' },
  '/invitations/accept': { name: 'invitation-accept' },
  '/accept-invitation': { name: 'invitation-accept' },
  '/ownership-transfers/accept': { name: 'ownership-accept' },
  '/accept-ownership-transfer': { name: 'ownership-accept' },
  '/tools/integration': { name: 'integration' },
}

export function resolveRoute(pathname: string): AppRoute {
  const path = pathname.replace(/\/+$/, '') || '/'
  const exact = exactRoutes[path]
  if (exact) return exact

  const datasetMatch = /^\/datasets\/(\d+)$/.exec(path)
  if (datasetMatch) {
    const datasetId = Number(datasetMatch[1])
    if (Number.isSafeInteger(datasetId) && datasetId > 0) {
      return { name: 'dataset-detail', datasetId }
    }
  }

  return { name: 'not-found' }
}

export function hrefForRoute(route: AppRoute): string {
  if (route.name === 'dataset-detail') return `/datasets/${route.datasetId}`
  const paths: Partial<Record<AppRoute['name'], string>> = {
    overview: '/overview',
    datasets: '/datasets',
    analytics: '/analytics',
    activity: '/activity',
    reports: '/reports',
    expenses: '/expenses',
    inventory: '/inventory',
    team: '/team',
    'business-settings': '/settings/business',
    'profile-settings': '/settings/profile',
    'invitation-accept': '/invitations/accept',
    'ownership-accept': '/ownership-transfers/accept',
    integration: '/tools/integration',
  }
  return paths[route.name] ?? '/overview'
}
