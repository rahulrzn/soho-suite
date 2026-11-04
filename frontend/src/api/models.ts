export type BusinessRole = 'OWNER' | 'MANAGER' | 'VIEWER'

export type UserProfile = {
  id: number
  firebaseUid: string
  username: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  business: Business | null
  businessRole: BusinessRole | null
}

export type Business = {
  id: number
  businessCode: string
  company: string
  legalBusinessName: string | null
  tradingName: string | null
  businessType: string | null
  industry: string | null
  legalStructure: string | null
  businessEmail: string | null
  businessCurrency: string | null
  financialYearStartMonth: number | null
  businessStatus: string | null
  country: string | null
  state: string | null
  city: string | null
  pincode: string | null
}

export type BusinessMember = {
  userId: number
  username: string
  firstName: string
  lastName: string
  role: BusinessRole
}

export type DatasetStatus = 'UPLOADED' | 'IMPORTED' | string
export type DatasetMetadata = {
  id: number
  name: string
  description?: string | null
  originalFilename: string
  fileType: string
  status: DatasetStatus
  rowCount: number
  columnCount: number
  createdAt: string
  importedAt?: string | null
}
export type DatasetColumn = {
  originalName: string
  name: string
  type: string
  missingValues: number
  blankHeader: boolean
  duplicateHeader: boolean
}
export type DatasetDetail = DatasetMetadata & {
  columns: DatasetColumn[]
  findings: Record<string, number>
  rows: string[][]
  page: number
  pageSize: number
  totalRows: number
}
export type DatasetRowsPage = { rows: string[][]; page: number; pageSize: number; totalRows: number }

export type MetricStatus = 'AVAILABLE' | 'INCOMPLETE' | 'UNAVAILABLE'
export type Metric<T> = { status: MetricStatus; value: T | null; reason: string | null }
export type SalesTrendPoint = { date: string; salesAmount: number }
export type AnalyticsOverview = {
  datasetId: number | null
  datasetName: string | null
  from: string
  to: string
  currency: string | null
  totalSalesAmount: Metric<number>
  distinctOrderCount: Metric<number>
  averageOrderValue: Metric<number>
  distinctCustomerCount: Metric<number>
  dailySalesTrend: Metric<SalesTrendPoint[]>
  salesChangePercent: Metric<number>
}
export type HealthScore = {
  status: string
  score: number | null
  currency: string | null
  from: string
  to: string
  components: { name: string; weightPercent: number; inputStatus: MetricStatus; score: number | null; formula: string; reason: string | null }[]
  interpretation: string
  limitations: string
}
export type ActivityEvent = {
  id: number
  actorUserId: number | null
  action: string
  targetType: string | null
  targetId: string | null
  summary: string
  occurredAt: string
}
export type Page<T> = { items: T[]; total: number; page: number; size: number }

export type Invitation = {
  id: number
  email: string
  role: BusinessRole
  status: string
  expiresAt: string
  token: string | null
  acceptancePath: string | null
}
export type OwnershipTransfer = {
  id: number
  businessId: number
  currentOwnerUserId: number
  proposedOwnerUserId: number
  status: string
  expiresAt: string
  token: string | null
  acceptancePath: string | null
}

export type ExpenseCategory = 'RENT' | 'UTILITIES' | 'PAYROLL' | 'MARKETING' | 'SUPPLIES' | 'TRANSPORT' | 'PROFESSIONAL_SERVICES' | 'MAINTENANCE' | 'OTHER'
export type Expense = {
  id: number
  expenseDate: string
  amount: number
  currency: string
  category: ExpenseCategory
  description: string
  reference: string | null
  createdBy: number
  createdAt: string
  updatedAt: string
}
export type ExpenseSummary = { currencies: { currency: string; total: number; categories: { category: ExpenseCategory; total: number }[] }[] }

export type InventoryItem = { id: number; name: string; sku: string | null; description: string | null; active: boolean; quantity: number; createdAt: string; updatedAt: string }
export type InventoryMovementType = 'OPENING_STOCK' | 'RECEIPT' | 'ADJUSTMENT' | 'DAMAGE' | 'COUNT_CORRECTION'
export type InventoryMovement = { id: number; itemId: number; type: InventoryMovementType; quantityDelta: number; resultingQuantity: number; reason: string; actorUserId: number; occurredAt: string }
