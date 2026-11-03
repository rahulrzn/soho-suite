import { describe, expect, it } from 'vitest'
import {
  canEditBusiness,
  canManageMembers,
  canWriteDatasets,
  roleForActiveBusiness,
} from './membershipRole'

describe('roleForActiveBusiness', () => {
  const members = [
    { userId: 10, role: 'OWNER' },
    { userId: 22, role: 'VIEWER' },
  ]

  it('returns the membership role for the profile user', () => {
    expect(roleForActiveBusiness(22, members)).toBe('VIEWER')
    expect(roleForActiveBusiness(10, members)).toBe('OWNER')
  })

  it('returns empty when membership is missing', () => {
    expect(roleForActiveBusiness(99, members)).toBe('')
    expect(roleForActiveBusiness(null, members)).toBe('')
    expect(roleForActiveBusiness(undefined, [])).toBe('')
  })
})

describe('permission helpers', () => {
  it('gates write and member-admin actions by role', () => {
    expect(canWriteDatasets('OWNER')).toBe(true)
    expect(canWriteDatasets('MANAGER')).toBe(true)
    expect(canWriteDatasets('VIEWER')).toBe(false)
    expect(canEditBusiness('VIEWER')).toBe(false)
    expect(canManageMembers('OWNER')).toBe(true)
    expect(canManageMembers('MANAGER')).toBe(false)
  })
})
