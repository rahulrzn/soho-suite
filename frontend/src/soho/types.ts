/**
 * View-model types consumed by Soho Suite presentational components.
 *
 * These describe the SHAPE the UI expects — they are not API contracts.
 * When integrating, map your Spring Boot DTOs into these shapes (or adapt
 * the component props) at the container/page level.
 */

export type ValueFormat = "currency" | "number" | "percent" | "days";
export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "accent";

export interface Kpi {
  id: string;
  label: string;
  value: number | null;
  format: ValueFormat;
  /** Percent change vs comparison period, e.g. 12.4 = +12.4% */
  delta: number | null;
  /** Whether an increase is good (revenue) or bad (expenses) */
  goodWhen?: "up" | "down";
  spark?: number[];
  caption?: string;
  reason?: string;
}

export interface HealthFactor {
  label: string;
  score: number; // 0–100
  weight: number; // 0–1
  note: string;
}

export interface HealthScore {
  score: number;
  band?: "Thriving" | "Healthy" | "Watch" | "At risk";
  change?: number;
  summary?: string;
  factors?: HealthFactor[];
  history?: { label: string; score: number }[];
}

export interface TrendPoint {
  label: string;
  [series: string]: number | string | null;
}

export interface Insight {
  id: string;
  tone: "positive" | "warning" | "neutral";
  title: string;
  body: string;
  metric?: string;
}

export interface CategoryValue {
  label: string;
  value: number;
  share?: number;
}

export type DatasetStatus = "ready" | "processing" | "needs-review" | "failed";

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  source: string;
  rows: number;
  columns: number;
  sizeLabel?: string;
  updatedAt: string;
  status: DatasetStatus;
  quality?: number;
  owner?: string;
}

export interface ColumnProfile {
  name: string;
  type: "text" | "number" | "date" | "currency" | "category";
  completeness: number;
  unique: number;
  sample: string;
  issue?: string;
}

export interface QualityCheck {
  id: string;
  label: string;
  result: "pass" | "warn" | "fail";
  detail: string;
  affectedRows?: number;
}

export type ExpenseStatus = "approved" | "pending" | "flagged";

export interface Expense {
  id: string;
  date: string;
  vendor: string;
  category: string;
  amount: number;
  method: "Card" | "Bank transfer" | "Cash" | "Invoice";
  status: ExpenseStatus;
  submittedBy: string;
  hasReceipt: boolean;
}

export interface BudgetLine {
  category: string;
  spent: number;
  budget: number;
}

export type StockStatus = "in-stock" | "low" | "out";

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  onHand: number;
  reorderPoint: number;
  unitCost: number;
  location: string;
  status: StockStatus;
  velocity: number[];
}

export type MovementType = "received" | "sold" | "adjusted" | "transferred" | "returned";

export interface StockMovement {
  id: string;
  date: string;
  time: string;
  sku: string;
  item: string;
  type: MovementType;
  qty: number;
  by: string;
  reference: string;
}

export interface ReportItem {
  id: string;
  title: string;
  type: "Financial" | "Operations" | "Inventory" | "Team";
  period: string;
  generatedAt: string;
  status: "ready" | "generating" | "failed";
  format: "PDF" | "CSV" | "XLSX";
  size?: string;
  author: string;
}

export interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  type: ReportItem["type"];
  visual: "bars" | "line" | "table" | "donut";
}

export interface ScheduledReport {
  id: string;
  title: string;
  cadence: string;
  nextRun: string;
  recipients: number;
}

export type Role = "Owner" | "Admin" | "Manager" | "Analyst" | "Viewer";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "suspended";
  lastActive: string;
  initials: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  sentAt: string;
  expiresIn: string;
  invitedBy: string;
}

export interface Permission {
  capability: string;
  roles: Role[];
}

export type ActivityModule = "Datasets" | "Expenses" | "Inventory" | "Reports" | "Team" | "Settings";

export interface ActivityEvent {
  id: string;
  actor: string;
  actorInitials: string;
  action: string;
  target: string;
  module: ActivityModule;
  day: string;
  time: string;
  detail?: string;
  isCurrentUser?: boolean;
}

export type DashboardActivityEvent = Pick<ActivityEvent, "id" | "module"> & Partial<Pick<ActivityEvent, "actor" | "actorInitials" | "action" | "target" | "day" | "time" | "detail">> & { summary?: string; occurredAt?: string };

export interface BusinessProfile {
  name: string;
  legalName: string;
  industry: string;
  size: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  fiscalYearStart: string;
  taxId: string;
}

export interface CurrentUser {
  name: string;
  email: string;
  initials: string;
  role: Role;
}
