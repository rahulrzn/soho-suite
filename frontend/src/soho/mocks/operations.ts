/** MOCK DATA — visual prototype only (expenses + inventory). */
import type { BudgetLine, Expense, InventoryItem, StockMovement, TrendPoint } from "../types";

export const mockExpenses: Expense[] = [
  { id: "e1", date: "Nov 3", vendor: "Fern & Kiln Pottery", category: "Inventory purchases", amount: 4820, method: "Bank transfer", status: "approved", submittedBy: "Ana Ortiz", hasReceipt: true },
  { id: "e2", date: "Nov 3", vendor: "Pacific Freight Co.", category: "Freight & shipping", amount: 1265.4, method: "Invoice", status: "pending", submittedBy: "Jonah Kim", hasReceipt: true },
  { id: "e3", date: "Nov 2", vendor: "NW Natural", category: "Utilities", amount: 412.88, method: "Card", status: "approved", submittedBy: "Priya Raman", hasReceipt: true },
  { id: "e4", date: "Nov 2", vendor: "Meta Ads", category: "Marketing", amount: 750, method: "Card", status: "approved", submittedBy: "Marcus Bell", hasReceipt: false },
  { id: "e5", date: "Nov 1", vendor: "Pearl District Properties", category: "Rent", amount: 8200, method: "Bank transfer", status: "approved", submittedBy: "Priya Raman", hasReceipt: true },
  { id: "e6", date: "Nov 1", vendor: "Uline", category: "Packaging", amount: 389.15, method: "Card", status: "flagged", submittedBy: "Jonah Kim", hasReceipt: false },
  { id: "e7", date: "Oct 31", vendor: "Gusto Payroll", category: "Payroll", amount: 12840, method: "Bank transfer", status: "approved", submittedBy: "Priya Raman", hasReceipt: true },
  { id: "e8", date: "Oct 30", vendor: "Stumptown Coffee", category: "Office & supplies", amount: 64.5, method: "Cash", status: "pending", submittedBy: "Ana Ortiz", hasReceipt: true },
  { id: "e9", date: "Oct 29", vendor: "Shopfront", category: "Software", amount: 299, method: "Card", status: "approved", submittedBy: "Marcus Bell", hasReceipt: true },
];

export const mockBudget: BudgetLine[] = [
  { category: "Payroll", spent: 12840, budget: 14000 },
  { category: "Rent", spent: 8200, budget: 8200 },
  { category: "Inventory purchases", spent: 4820, budget: 9000 },
  { category: "Freight & shipping", spent: 2360, budget: 2000 },
  { category: "Marketing", spent: 1650, budget: 2500 },
  { category: "Utilities & software", spent: 1010, budget: 1300 },
];

export const mockExpenseByMonth: TrendPoint[] = [
  { label: "Jun", payroll: 12400, rent: 8200, inventory: 9800, other: 6400 },
  { label: "Jul", payroll: 12400, rent: 8200, inventory: 8600, other: 6100 },
  { label: "Aug", payroll: 12600, rent: 8200, inventory: 7900, other: 5900 },
  { label: "Sep", payroll: 12600, rent: 8200, inventory: 7400, other: 5700 },
  { label: "Oct", payroll: 12840, rent: 8200, inventory: 6300, other: 5360 },
  { label: "Nov", payroll: 12840, rent: 8200, inventory: 4820, other: 5620 },
];

export const mockExpenseCategories = [
  "All categories",
  "Payroll",
  "Rent",
  "Inventory purchases",
  "Freight & shipping",
  "Marketing",
  "Utilities",
  "Software",
  "Packaging",
  "Office & supplies",
];

export const mockInventory: InventoryItem[] = [
  { sku: "CR-2210", name: "Speckled stoneware mug", category: "Ceramics", onHand: 0, reorderPoint: 36, unitCost: 9.4, location: "Warehouse B", status: "out", velocity: [14, 16, 18, 15, 19, 22, 20] },
  { sku: "TX-1042", name: "Stonewashed linen throw · Sage", category: "Textiles", onHand: 6, reorderPoint: 20, unitCost: 38, location: "Front store", status: "low", velocity: [4, 5, 5, 6, 7, 6, 8] },
  { sku: "CN-0381", name: "Cedar & smoke candle 8oz", category: "Fragrance", onHand: 11, reorderPoint: 24, unitCost: 7.25, location: "Front store", status: "low", velocity: [9, 10, 11, 10, 12, 11, 13] },
  { sku: "FN-0904", name: "Walnut serving board", category: "Furniture", onHand: 42, reorderPoint: 15, unitCost: 29.1, location: "Warehouse B", status: "in-stock", velocity: [3, 4, 3, 3, 2, 4, 3] },
  { sku: "ST-0112", name: "Hand-bound linen journal", category: "Stationery", onHand: 128, reorderPoint: 30, unitCost: 6.8, location: "Warehouse B", status: "in-stock", velocity: [6, 5, 6, 5, 4, 5, 4] },
  { sku: "CR-2214", name: "Speckled stoneware bowl", category: "Ceramics", onHand: 64, reorderPoint: 30, unitCost: 11.2, location: "Warehouse B", status: "in-stock", velocity: [7, 8, 9, 8, 10, 9, 11] },
  { sku: "TX-1050", name: "Waffle cotton tea towel (2)", category: "Textiles", onHand: 87, reorderPoint: 40, unitCost: 8.5, location: "Front store", status: "in-stock", velocity: [5, 6, 5, 7, 6, 6, 7] },
  { sku: "CN-0390", name: "Fig leaf candle 12oz", category: "Fragrance", onHand: 33, reorderPoint: 24, unitCost: 10.1, location: "Front store", status: "in-stock", velocity: [6, 6, 7, 6, 8, 7, 9] },
];

export const mockMovements: StockMovement[] = [
  { id: "m1", date: "Today", time: "10:42 AM", sku: "CR-2210", item: "Speckled stoneware mug", type: "sold", qty: -4, by: "POS · Front store", reference: "TXN-0084213" },
  { id: "m2", date: "Today", time: "9:15 AM", sku: "FN-0904", item: "Walnut serving board", type: "received", qty: 24, by: "Jonah Kim", reference: "PO-1182" },
  { id: "m3", date: "Today", time: "8:30 AM", sku: "TX-1042", item: "Stonewashed linen throw · Sage", type: "transferred", qty: 6, by: "Ana Ortiz", reference: "Warehouse B → Front store" },
  { id: "m4", date: "Yesterday", time: "5:48 PM", sku: "CN-0381", item: "Cedar & smoke candle 8oz", type: "returned", qty: 1, by: "POS · Front store", reference: "RET-0412" },
  { id: "m5", date: "Yesterday", time: "3:02 PM", sku: "CR-2214", item: "Speckled stoneware bowl", type: "adjusted", qty: -2, by: "Jonah Kim", reference: "Damaged in storage" },
  { id: "m6", date: "Yesterday", time: "11:20 AM", sku: "ST-0112", item: "Hand-bound linen journal", type: "received", qty: 60, by: "Jonah Kim", reference: "PO-1179" },
  { id: "m7", date: "Nov 1", time: "4:10 PM", sku: "TX-1050", item: "Waffle cotton tea towel (2)", type: "sold", qty: -12, by: "Online shop", reference: "ORD-22841" },
];

export const mockReorderSuggestions = [
  { sku: "CR-2210", name: "Speckled stoneware mug", suggestedQty: 96, supplier: "Fern & Kiln", leadTime: "10 days", cost: 902.4 },
  { sku: "TX-1042", name: "Stonewashed linen throw · Sage", suggestedQty: 30, supplier: "Loom House", leadTime: "14 days", cost: 1140 },
  { sku: "CN-0381", name: "Cedar & smoke candle 8oz", suggestedQty: 48, supplier: "Ember Works", leadTime: "7 days", cost: 348 },
];
