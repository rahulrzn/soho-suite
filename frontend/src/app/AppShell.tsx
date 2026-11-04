import type { ReactNode } from 'react'
import type { BusinessRole } from '../api/models'
import type { UserProfile, Business } from '../api/models'
import { RouteLink, navigate } from './navigation'
import type { AppRoute } from './routes'

const navigation: { label: string; route: AppRoute; group: string; roles?: BusinessRole[] }[] = [
  { label: 'Overview', route: { name: 'overview' }, group: 'Workspace' },
  { label: 'Datasets', route: { name: 'datasets' }, group: 'Workspace' },
  { label: 'Analytics', route: { name: 'analytics' }, group: 'Workspace' },
  { label: 'Activity', route: { name: 'activity' }, group: 'Workspace' },
  { label: 'Expenses', route: { name: 'expenses' }, group: 'Operations' },
  { label: 'Inventory', route: { name: 'inventory' }, group: 'Operations' },
  { label: 'Team', route: { name: 'team' }, group: 'Manage' },
  { label: 'Business settings', route: { name: 'business-settings' }, group: 'Manage' },
]

const titles: Partial<Record<AppRoute['name'], string>> = {
  overview: 'Overview', datasets: 'Datasets', 'dataset-detail': 'Dataset details', analytics: 'Analytics',
  activity: 'Activity', expenses: 'Expenses', inventory: 'Inventory', team: 'Team', 'business-settings': 'Business settings',
  'profile-settings': 'Profile settings',
}

type Props = {
  route: AppRoute
  profile: UserProfile
  businesses: Business[]
  business: Business
  role: BusinessRole | ''
  onSelectBusiness: (id: number) => void
  onSignOut: () => void
  children: ReactNode
}

export function AppShell({ route, profile, businesses, business, role, onSelectBusiness, onSignOut, children }: Props) {
  const title = titles[route.name] ?? 'Soho Suite'
  const groups = [...new Set(navigation.map((item) => item.group))]
  return (
    <div className="suite-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="suite-sidebar" aria-label="Main navigation">
        <RouteLink className="suite-brand" to={{ name: 'overview' }} aria-label="Soho Suite overview">
          <span className="brand-symbol" aria-hidden="true">S</span><span>soho<span className="brand-light">suite</span></span>
        </RouteLink>
        <label className="workspace-picker-label" htmlFor="workspace-picker">Your business</label>
        <select id="workspace-picker" className="workspace-picker" value={business.id} onChange={(event) => onSelectBusiness(Number(event.target.value))} aria-label="Choose business workspace">
          {businesses.map((item) => <option key={item.id} value={item.id}>{item.tradingName || item.company}</option>)}
        </select>
        <nav className="primary-nav">
          {groups.map((group) => (
            <div className="nav-group" key={group}>
              <p className="nav-group-label">{group}</p>
              {navigation.filter((item) => item.group === group).map((item) => {
                const selected = route.name === item.route.name || (route.name === 'dataset-detail' && item.route.name === 'datasets')
                const disabled = item.roles !== undefined && !item.roles.includes(role as BusinessRole)
                return <RouteLink key={item.label} to={item.route} className={`nav-link${selected ? ' is-active' : ''}`} aria-current={selected ? 'page' : undefined} aria-disabled={disabled || undefined}>
                  <span>{item.label}</span>
                </RouteLink>
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom" aria-hidden="true"><span className="workspace-privacy-note">Private to your team</span></div>
      </aside>
      <div className="suite-main-column">
        <header className="suite-topbar">
          <div className="workspace-context"><span className="workspace-context-mark" aria-hidden="true">{(business.tradingName || business.company).trim().charAt(0).toUpperCase()}</span><div><strong>{business.tradingName || business.company}</strong><small>Business workspace</small></div></div>
          <div className="topbar-actions">
            <span className="role-chip">{role || 'Member'}</span>
            <details className="profile-menu">
              <summary aria-label="Account menu"><span className="avatar">{initials(profile.firstName, profile.lastName)}</span><span className="profile-name">{profile.firstName} {profile.lastName}</span><span className="chevron">âŒ„</span></summary>
              <div className="profile-menu-panel"><p className="profile-email">{profile.email}</p><button type="button" className="menu-action" onClick={() => navigate('/settings/profile')}>Profile settings</button><button type="button" className="menu-action" onClick={() => navigate('/settings/business')}>Business settings</button><button type="button" className="menu-action" onClick={onSignOut}>Sign out</button></div>
            </details>
          </div>
        </header>
        <main className="suite-content" id="main-content" tabIndex={-1}>
          <div className="page-intro"><h1>{title}</h1></div>
          {children}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.filter((item) => ['overview', 'datasets', 'analytics', 'expenses'].includes(item.route.name)).map((item) => {
          const selected = route.name === item.route.name
          return <RouteLink key={item.label} to={item.route} className={`mobile-nav-link${selected ? ' is-active' : ''}`} aria-current={selected ? 'page' : undefined}><small>{item.label}</small></RouteLink>
        })}
        <details className="mobile-more"><summary className={['activity', 'inventory', 'team', 'business-settings', 'profile-settings'].includes(route.name) ? 'is-active' : ''}><span aria-hidden="true">Â·Â·Â·</span><small>More</small></summary><div className="mobile-more-menu">{navigation.filter((item) => ['activity', 'inventory', 'team', 'business-settings'].includes(item.route.name)).map((item) => <RouteLink key={item.label} to={item.route} onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}>{item.label}</RouteLink>)}<RouteLink to={{ name: 'profile-settings' }} onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}>Profile settings</RouteLink></div></details>
      </nav>
    </div>
  )
}

function initials(first: string, last: string) { return `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || 'S' }
