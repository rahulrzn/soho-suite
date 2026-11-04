/** MOCK DATA — visual prototype only. */
import type { ColumnProfile, Dataset, QualityCheck } from "../types";

export const mockDatasets: Dataset[] = [
  { id: "d1", name: "POS transactions · Nov 2026", source: "POS export", rows: 18432, columns: 14, sizeLabel: "4.2 MB", updatedAt: "Today, 8:14 AM", status: "ready", quality: 97, owner: "Priya Raman" },
  { id: "d2", name: "Online orders (Shopfront)", source: "CSV", rows: 6210, columns: 22, sizeLabel: "2.8 MB", updatedAt: "Today, 7:02 AM", status: "ready", quality: 94, owner: "Marcus Bell" },
  { id: "d3", name: "Supplier price list 2026", source: "Excel", rows: 842, columns: 9, sizeLabel: "312 KB", updatedAt: "Yesterday", status: "needs-review", quality: 71, owner: "Ana Ortiz" },
  { id: "d4", name: "Expense ledger Q4", source: "Google Sheets", rows: 1294, columns: 11, sizeLabel: "540 KB", updatedAt: "Nov 2", status: "ready", quality: 89, owner: "Priya Raman" },
  { id: "d5", name: "Inventory count · Warehouse B", source: "CSV", rows: 2306, columns: 8, sizeLabel: "690 KB", updatedAt: "Processing…", status: "processing", quality: 0, owner: "Jonah Kim" },
  { id: "d6", name: "Wholesale accounts", source: "Excel", rows: 0, columns: 0, sizeLabel: "1.1 MB", updatedAt: "Oct 29", status: "failed", quality: 0, owner: "Marcus Bell" },
];

export const mockColumnProfiles: Record<string, ColumnProfile[]> = {
  d1: [
    { name: "transaction_id", type: "text", completeness: 100, unique: 100, sample: "TXN-0084213" },
    { name: "timestamp", type: "date", completeness: 100, unique: 99.4, sample: "2026-11-03 14:22" },
    { name: "sku", type: "category", completeness: 99.8, unique: 2.1, sample: "CR-2210" },
    { name: "quantity", type: "number", completeness: 100, unique: 0.2, sample: "2" },
    { name: "unit_price", type: "currency", completeness: 100, unique: 1.8, sample: "$24.00" },
    { name: "discount", type: "currency", completeness: 86.1, unique: 0.4, sample: "$0.00", issue: "13.9% empty — treated as $0" },
    { name: "payment_method", type: "category", completeness: 100, unique: 0.03, sample: "Card" },
    { name: "staff_id", type: "category", completeness: 97.2, unique: 0.06, sample: "S-014" },
  ],
  d3: [
    { name: "supplier", type: "text", completeness: 100, unique: 4.3, sample: "Fern & Kiln" },
    { name: "sku", type: "category", completeness: 92.4, unique: 91.2, sample: "CR-2210", issue: "64 rows missing SKU" },
    { name: "unit_cost", type: "currency", completeness: 98.1, unique: 38, sample: "$9.40", issue: "Mixed currency symbols" },
    { name: "moq", type: "number", completeness: 74.5, unique: 1.1, sample: "24", issue: "25.5% empty" },
    { name: "lead_time_days", type: "number", completeness: 100, unique: 1.4, sample: "10" },
    { name: "effective_date", type: "date", completeness: 100, unique: 0.5, sample: "01/04/2026", issue: "Ambiguous date format" },
  ],
};

export const mockUploadPreview = {
  fileName: "inventory_count_dec.csv",
  fileSize: "684 KB",
  rows: 2306,
  headers: ["SKU", "Item name", "Location", "Counted", "Unit cost", "Counted on"],
  detected: ["category", "text", "category", "number", "currency", "date"] as const,
  mapping: ["sku", "item_name", "location", "on_hand", "unit_cost", "count_date"],
  targetFields: ["sku", "item_name", "location", "on_hand", "unit_cost", "count_date", "category", "notes", "— skip column —"],
  rows_: [
    ["CR-2210", "Speckled stoneware mug", "Warehouse B", "0", "$9.40", "2026-12-01"],
    ["TX-1042", "Stonewashed linen throw · Sage", "Warehouse B", "6", "$38.00", "2026-12-01"],
    ["CN-0381", "Cedar & smoke candle 8oz", "Front store", "11", "$7.25", "2026-12-01"],
    ["FN-0904", "Walnut serving board", "Warehouse B", "", "$29.10", "2026-12-01"],
    ["ST-0112", "Hand-bound linen journal", "Front store", "48", "$6.80", "12/01/2026"],
    ["CR-2214", "Speckled stoneware bowl", "Warehouse B", "-3", "$11.20", "2026-12-01"],
  ],
};

export const mockQualityChecks: QualityCheck[] = [
  { id: "q1", label: "Required columns present", result: "pass", detail: "SKU, quantity and cost columns were found and mapped." },
  { id: "q2", label: "Duplicate rows", result: "pass", detail: "No duplicate SKU + location pairs detected." },
  { id: "q3", label: "Missing values", result: "warn", detail: "\"Counted\" is empty in 12 rows. They will be imported as blank.", affectedRows: 12 },
  { id: "q4", label: "Date formats", result: "warn", detail: "38 rows use MM/DD/YYYY. They'll be normalized to ISO dates.", affectedRows: 38 },
  { id: "q5", label: "Negative quantities", result: "fail", detail: "3 rows have negative counts. Fix them or exclude from import.", affectedRows: 3 },
  { id: "q6", label: "Unknown SKUs", result: "pass", detail: "All SKUs match items in your catalog." },
];
