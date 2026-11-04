/** Maps domain statuses to badge tones/labels so every screen speaks the same visual language. */
import { Badge } from "./badge";
import type { DatasetStatus, ExpenseStatus, ReportItem, StockStatus, Tone } from "../types";

const datasetMap: Record<DatasetStatus, [Tone, string]> = {
  ready: ["success", "Ready"],
  processing: ["info", "Processing"],
  "needs-review": ["warning", "Needs review"],
  failed: ["danger", "Failed"],
};

const expenseMap: Record<ExpenseStatus, [Tone, string]> = {
  approved: ["success", "Approved"],
  pending: ["neutral", "Pending"],
  flagged: ["danger", "Flagged"],
};

const stockMap: Record<StockStatus, [Tone, string]> = {
  "in-stock": ["success", "In stock"],
  low: ["warning", "Low stock"],
  out: ["danger", "Out of stock"],
};

const reportMap: Record<ReportItem["status"], [Tone, string]> = {
  ready: ["success", "Ready"],
  generating: ["info", "Generating"],
  failed: ["danger", "Failed"],
};

export function DatasetStatusBadge({ status }: { status: DatasetStatus }) {
  const [tone, label] = datasetMap[status];
  return <Badge tone={tone} dot>{label}</Badge>;
}

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const [tone, label] = expenseMap[status];
  return <Badge tone={tone} dot>{label}</Badge>;
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const [tone, label] = stockMap[status];
  return <Badge tone={tone} dot>{label}</Badge>;
}

export function ReportStatusBadge({ status }: { status: ReportItem["status"] }) {
  const [tone, label] = reportMap[status];
  return <Badge tone={tone} dot>{label}</Badge>;
}
