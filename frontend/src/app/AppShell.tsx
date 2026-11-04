import type { ReactNode } from 'react'
import type { BusinessRole } from '../api/models'
import type { UserProfile, Business } from '../api/models'
import { RouteLink, navigate } from './navigation'
import type { AppRoute } from './routes'
import { BrandWordmark } from '../soho/shell/logo'

type NavIconName = 'overview' | 'analytics' | 'datasets' | 'reports' | 'expenses' | 'inventory' | 'team' | 'activity' | 'settings' | 'more'
const navigation: { label: string; route: AppRoute; group: string; icon: NavIconName; roles?: BusinessRole[] }[] = [
  { label: 'Overview', route: { name: 'overview' }, group: 'Overview', icon: 'overview' },
  { label: 'Analytics', route: { name: 'analytics' }, group: 'Overview', icon: 'analytics' },
  { label: 'Datasets', route: { name: 'datasets' }, group: 'Data', icon: 'datasets' },
  { label: 'Reports', route: { name: 'reports' }, group: 'Data', icon: 'reports' },
  { label: 'Expenses', route: { name: 'expenses' }, group: 'Operations', icon: 'expenses' },
  { label: 'Inventory', route: { name: 'inventory' }, group: 'Operations', icon: 'inventory' },
  { label: 'Team', route: { name: 'team' }, group: 'Workspace', icon: 'team' },
  { label: 'Activity', route: { name: 'activity' }, group: 'Workspace', icon: 'activity' },
  { label: 'Business settings', route: { name: 'business-settings' }, group: 'Workspace', icon: 'settings' },
]
const titles: Partial<Record<AppRoute['name'], string>> = {
  overview: 'Dashboard', datasets: 'Datasets', 'dataset-detail': 'Dataset details', analytics: 'Analytics',
  activity: 'Activity', reports: 'Reports', expenses: 'Expenses', inventory: 'Inventory', team: 'Team',
  'business-settings': 'Business settings', 'profile-settings': 'Profile settings',
}
const descriptions: Partial<Record<AppRoute['name'], string>> = {
  overview: '',
  datasets: 'Review imports, data quality, and the rows stored for this business.',
  'dataset-detail': 'Inspect stored rows and manage this dataset.',
  analytics: 'Explore only the sales measures supported by your imported data.',
  reports: 'Download business data using the CSV exports available to this workspace.',
  activity: 'A record of changes captured by the business workspace.',
  expenses: 'Record and review operating costs in the business currency.',
  inventory: 'Manage items and inspect the stock movement ledger.',
  team: 'Manage membership and access for this business.',
  'business-settings': 'Update the business information used across this workspace.',
  'profile-settings': 'Manage your Soho Suite profile details.',
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
  const title = route.name === 'overview' ? `${greeting()}, ${profile.firstName}` : titles[route.name] ?? 'Soho Suite'
  const description = route.name === 'overview'
    ? `Here's how ${business.tradingName || business.company} is doing. Metrics reflect the data connected to this workspace.`
    : descriptions[route.name]
  const groups = ['Overview', 'Data', 'Operations', 'Workspace']
  const moreActive = ['reports', 'activity', 'inventory', 'team', 'business-settings', 'profile-settings'].includes(route.name)
  return (
    <div className="suite-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="suite-sidebar" aria-label="Main navigation">
        <RouteLink className="suite-brand" to={{ name: 'overview' }} aria-label="Soho Suite overview">
          <BrandWordmark />
        </RouteLink>
        <label className="workspace-picker-label" htmlFor="workspace-picker">Your business</label>
        <select id="workspace-picker" className="workspace-picker" value={business.id} onChange={(event) => onSelectBusiness(Number(event.target.value))} aria-label="Choose business workspace">
          {businesses.map((item) => <option key={item.id} value={item.id}>{item.tradingName || item.company}</option>)}
        </select>
        <nav className="primary-nav">
          {groups.map((group) => <div className="nav-group" key={group}>
            <p className="nav-group-label">{group}</p>
            {navigation.filter((item) => item.group === group).map((item) => {
              const selected = route.name === item.route.name || (route.name === 'dataset-detail' && item.route.name === 'datasets')
              const disabled = item.roles !== undefined && !item.roles.includes(role as BusinessRole)
              return <RouteLink key={item.label} to={item.route} className={`nav-link${selected ? ' is-active' : ''}`} aria-current={selected ? 'page' : undefined} aria-disabled={disabled || undefined}>
                <NavIcon name={item.icon} /><span>{item.label}</span>
              </RouteLink>
            })}
          </div>)}
        </nav>
        <div className="sidebar-bottom" aria-hidden="true"><span className="workspace-privacy-note">Private to your team</span></div>
      </aside>
      <div className="suite-main-column">
        <header className="suite-topbar">
          <div className="workspace-context"><span className="workspace-context-mark" aria-hidden="true">{(business.tradingName || business.company).trim().charAt(0).toUpperCase()}</span><div><strong>{business.tradingName || business.company}</strong><small>Business workspace</small></div></div>
          <div className="topbar-actions">
            <span className="role-chip">{role || 'Member'}</span>
            <details className="profile-menu">
              <summary aria-label="Account menu"><span className="avatar">{initials(profile.firstName, profile.lastName)}</span><span className="profile-name">{profile.firstName} {profile.lastName}</span><span className="chevron" aria-hidden="true">⌄</span></summary>
              <div className="profile-menu-panel"><p className="profile-email">{profile.email}</p><button type="button" className="menu-action" onClick={() => navigate('/settings/profile')}>Profile settings</button><button type="button" className="menu-action" onClick={() => navigate('/settings/business')}>Business settings</button><button type="button" className="menu-action" onClick={onSignOut}>Sign out</button></div>
            </details>
          </div>
        </header>
        <main className="suite-content" id="main-content" tabIndex={-1}>
          <div className="page-intro"><div><h1>{title}</h1>{description && <p>{description}</p>}</div></div>
          {children}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.filter((item) => ['overview', 'datasets', 'analytics', 'expenses'].includes(item.route.name)).map((item) => {
          const selected = route.name === item.route.name || (route.name === 'dataset-detail' && item.route.name === 'datasets')
          return <RouteLink key={item.label} to={item.route} className={`mobile-nav-link${selected ? ' is-active' : ''}`} aria-current={selected ? 'page' : undefined}><NavIcon name={item.icon} /><small>{item.label}</small></RouteLink>
        })}
        <details className="mobile-more"><summary className={moreActive ? 'is-active' : ''}><NavIcon name="more" /><small>More</small></summary><div className="mobile-more-menu">
          {navigation.filter((item) => ['reports', 'activity', 'inventory', 'team', 'business-settings'].includes(item.route.name)).map((item) => <RouteLink key={item.label} to={item.route} onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}><NavIcon name={item.icon} />{item.label}</RouteLink>)}
          <RouteLink to={{ name: 'profile-settings' }} onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}><NavIcon name="settings" />Profile settings</RouteLink>
        </div></details>
      </nav>
    </div>
  )
}

function initials(first: string, last: string) { return `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase() || 'S' }

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

function NavIcon({ name }: { name: NavIconName }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  const icon: Record<NavIconName, ReactNode> = {
    overview: <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></>,
    analytics: <><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/></>,
    datasets: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
    reports: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/></>,
    expenses: <><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5M8 17h3"/></>,
    inventory: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5M12 13v8"/></>,
    team: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.6V20"/></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a8 8 0 0 0 0-6l1.4-1.1-1.4-2.4-1.7.6a8 8 0 0 0-5.7-1.6L11.7 2h-2.8l-.3 2.5a8 8 0 0 0-2.9 1.6L4 5.5 2.6 8l1.4 1.1a8 8 0 0 0 0 5.8L2.6 16l1.4 2.4 1.7-.6a8 8 0 0 0 2.9 1.6l.3 2.5h2.8l.3-2.5a8 8 0 0 0 2.9-1.6l1.7.6L20 16l-.6-1Z" transform="translate(1 0) scale(.92)"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  }
  return <svg {...props}>{icon[name]}</svg>
}
