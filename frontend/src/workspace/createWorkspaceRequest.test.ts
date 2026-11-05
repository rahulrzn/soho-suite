import { describe, expect, it } from 'vitest'
import { createWorkspaceRequest } from './createWorkspaceRequest'

describe('createWorkspaceRequest', () => {
  it('trims the new name and carries over the active workspace defaults', () => {
    expect(createWorkspaceRequest('  Side Shop  ', {
      businessCurrency: 'USD',
      businessType: 'RETAIL',
      financialYearStartMonth: 1,
    })).toEqual({
      company: 'Side Shop',
      tradingName: 'Side Shop',
      businessCurrency: 'USD',
      businessType: 'RETAIL',
      financialYearStartMonth: 1,
    })
  })

  it('uses application defaults when the active workspace has no values', () => {
    expect(createWorkspaceRequest('New Workspace', {
      businessCurrency: null,
      businessType: null,
      financialYearStartMonth: null,
    })).toEqual({
      company: 'New Workspace',
      tradingName: 'New Workspace',
      businessCurrency: 'INR',
      businessType: undefined,
      financialYearStartMonth: 4,
    })
  })
})
