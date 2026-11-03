export type MembershipMember = {
  userId: number
  role: string
}

/**
 * Resolve the caller's role for the active business from the members list.
 * Backend authorization remains authoritative; this is UI-only.
 */
export function roleForActiveBusiness(
  profileUserId: number | null | undefined,
  members: MembershipMember[],
): string {
  if (profileUserId == null || !Number.isFinite(profileUserId)) return ''
  const match = members.find((member) => member.userId === profileUserId)
  return match?.role ? String(match.role) : ''
}

export function canWriteDatasets(role: string): boolean {
  return role === 'OWNER' || role === 'MANAGER'
}

export function canManageMembers(role: string): boolean {
  return role === 'OWNER'
}

export function canEditBusiness(role: string): boolean {
  return role === 'OWNER' || role === 'MANAGER'
}
