import type { ReactNode } from 'react'
import type { Business, BusinessRole, UserProfile } from '../../api/models'
import { AppShell } from './app-shell'
import type { CurrentUser, Role } from '../types'

export function ProductionAppShell({ children, profile, businesses, business, role, onSelectBusiness, onSignOut }: {
  children: ReactNode
  profile: UserProfile
  businesses: Business[]
  business: Business
  role: BusinessRole | ''
  onSelectBusiness: (id: number) => void
  onSignOut: () => void
}) {
  const currentUser: CurrentUser = {
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email,
    initials: `${profile.firstName.trim().charAt(0)}${profile.lastName.trim().charAt(0)}`.toUpperCase() || 'S',
    role: toMockRole(role),
  }
  return <AppShell
    user={currentUser}
    businessName={business.tradingName || business.company}
    businesses={businesses.map((item) => ({ id: item.id, name: item.tradingName || item.company }))}
    businessId={business.id}
    onSelectBusiness={onSelectBusiness}
    onSignOut={onSignOut}
  >{children}</AppShell>
}

function toMockRole(role: BusinessRole | ''): Role {
  if (role === 'OWNER') return 'Owner'
  if (role === 'MANAGER') return 'Manager'
  return 'Viewer'
}
