import type { AppRoute } from '../app/routes'
import { RouteLink } from '../app/navigation'
import { ActivityPage } from './ActivityPage'
import { AnalyticsPage } from './AnalyticsPage'
import { DatasetDetailPage } from './DatasetDetailPage'
import { DatasetsPage } from './DatasetPage'
import { OverviewPage } from './OverviewPage'
import { BusinessSettingsPage, ProfileSettingsPage } from './SettingsPage'
import { ExpensesPage } from './ExpensesPage'
import { InventoryPage } from './InventoryPage'
import { TeamPage } from './TeamPage'
import type { PageCallbacks } from './types'

type Props = PageCallbacks & { route: AppRoute }

export function WorkspacePage({ route, onError, onNotice }: Props) {
  const callbacks = { onError, onNotice }
  switch (route.name) {
    case 'overview': return <OverviewPage {...callbacks} />
    case 'datasets': return <DatasetsPage {...callbacks} />
    case 'dataset-detail': return <DatasetDetailPage datasetId={route.datasetId} {...callbacks} />
    case 'analytics': return <AnalyticsPage {...callbacks} />
    case 'activity': return <ActivityPage {...callbacks} />
    case 'expenses': return <ExpensesPage {...callbacks} />
    case 'inventory': return <InventoryPage {...callbacks} />
    case 'team': return <TeamPage {...callbacks} />
    case 'business-settings': return <BusinessSettingsPage {...callbacks} />
    case 'profile-settings': return <ProfileSettingsPage {...callbacks} />
    case 'not-found': return <section className="content-panel empty-state"><span className="empty-mark">?</span><h2>Page not found</h2><p>This page is not part of the Soho Suite workspace.</p><RouteLink className="button-primary" to="/overview">Back to overview</RouteLink></section>
    default: return <section className="content-panel empty-state"><span className="empty-mark">S</span><h2>Workspace page unavailable</h2><p>This route needs an active workspace and a supported screen.</p></section>
  }
}
