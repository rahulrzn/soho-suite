import { createContext, useContext } from 'react'
import type { Business, BusinessMember, BusinessRole, UserProfile } from '../api/models'
import type { User } from 'firebase/auth'

export type WorkspaceState = {
  user: User
  profile: UserProfile
  businesses: Business[]
  business: Business
  members: BusinessMember[]
  role: BusinessRole | ''
  refreshWorkspace: () => Promise<void>
  selectBusiness: (id: number) => void
  refreshMembers: () => Promise<void>
  replaceProfile: (profile: UserProfile) => void
}

const WorkspaceContext = createContext<WorkspaceState | null>(null)

export const WorkspaceProvider = WorkspaceContext.Provider

// eslint-disable-next-line react-refresh/only-export-components -- This hook is colocated with its context provider for the workspace feature.
export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('This page requires an active business workspace.')
  return value
}
