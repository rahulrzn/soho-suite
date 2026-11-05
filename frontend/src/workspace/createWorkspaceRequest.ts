import type { BusinessUpsert } from '../api/businessApi'

type WorkspaceDefaults = {
  businessCurrency: string | null
  businessType: string | null
  financialYearStartMonth: number | null
}

export function createWorkspaceRequest(name: string, current: WorkspaceDefaults): BusinessUpsert {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Enter a workspace name.')

  return {
    company: cleanName,
    tradingName: cleanName,
    businessCurrency: current.businessCurrency || 'INR',
    businessType: current.businessType ?? undefined,
    financialYearStartMonth: current.financialYearStartMonth ?? 4,
  }
}
