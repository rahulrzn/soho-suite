import { lazy, Suspense, type ReactNode } from 'react'
import type { AppRoute } from '../app/routes'
import { RouteLink } from '../app/navigation'
import { LoadingLine } from '../components/Feedback'
import type { PageCallbacks } from './types'

const ActivityPage = lazy(() => import('./ActivityPage').then(({ ActivityPage: page }) => ({ default: page })))
const AnalyticsPage = lazy(() => import('./AnalyticsPage').then(({ AnalyticsPage: page }) => ({ default: page })))
const DatasetDetailPage = lazy(() => import('./DatasetDetailPage').then(({ DatasetDetailPage: page }) => ({ default: page })))
const DatasetsPage = lazy(() => import('./DatasetPage').then(({ DatasetsPage: page }) => ({ default: page })))
const OverviewPage = lazy(() => import('./OverviewPage').then(({ OverviewPage: page }) => ({ default: page })))
const BusinessSettingsPage = lazy(() => import('./SettingsPage').then(({ BusinessSettingsPage: page }) => ({ default: page })))
const ProfileSettingsPage = lazy(() => import('./SettingsPage').then(({ ProfileSettingsPage: page }) => ({ default: page })))
const ExpensesPage = lazy(() => import('./ExpensesPage').then(({ ExpensesPage: page }) => ({ default: page })))
const InventoryPage = lazy(() => import('./InventoryPage').then(({ InventoryPage: page }) => ({ default: page })))
const TeamPage = lazy(() => import('./TeamPage').then(({ TeamPage: page }) => ({ default: page })))
const ReportsPage = lazy(() => import('./ReportsPage').then(({ ReportsPage: page }) => ({ default: page })))

type Props = PageCallbacks & { route: AppRoute }

export function WorkspacePage({ route, onError, onNotice }: Props) {
  const callbacks = { onError, onNotice }
  let page: ReactNode
  switch (route.name) {
    case 'overview': page = <OverviewPage {...callbacks} />; break
    case 'datasets': page = <DatasetsPage {...callbacks} />; break
    case 'dataset-detail': page = <DatasetDetailPage datasetId={route.datasetId} {...callbacks} />; break
    case 'analytics': page = <AnalyticsPage {...callbacks} />; break
    case 'activity': page = <ActivityPage {...callbacks} />; break
    case 'reports': page = <ReportsPage {...callbacks} />; break
    case 'expenses': page = <ExpensesPage {...callbacks} />; break
    case 'inventory': page = <InventoryPage {...callbacks} />; break
    case 'team': page = <TeamPage {...callbacks} />; break
    case 'business-settings': page = <BusinessSettingsPage {...callbacks} />; break
    case 'profile-settings': page = <ProfileSettingsPage {...callbacks} />; break
    case 'not-found': page = <section className="content-panel empty-state"><span className="empty-mark">?</span><h2>Page not found</h2><p>This page is not part of the Soho Suite workspace.</p><RouteLink className="button-primary" to="/overview">Back to overview</RouteLink></section>; break
    default: page = <section className="content-panel empty-state"><span className="empty-mark">S</span><h2>Workspace page unavailable</h2><p>This route needs an active workspace and a supported screen.</p></section>
  }

  return <Suspense fallback={<section className="content-panel panel-pad"><LoadingLine text="Loading workspace page…" /></section>}>{page}</Suspense>
}
