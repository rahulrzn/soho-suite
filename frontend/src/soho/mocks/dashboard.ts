/** MOCK DATA — visual prototype only. */
import type { CategoryValue, HealthScore, Insight, Kpi, TrendPoint } from "../types";

export const mockHealthScore: HealthScore = {
  score: 78,
  band: "Healthy",
  change: 4,
  summary: "Margins and cash flow improved this month. Inventory turnover is the factor holding you back.",
  factors: [
    { label: "Profitability", score: 84, weight: 0.3, note: "Gross margin 46.2%, up 2.1 pts" },
    { label: "Cash flow", score: 81, weight: 0.25, note: "92 days of runway at current burn" },
    { label: "Revenue growth", score: 76, weight: 0.2, note: "+12.4% vs. last month" },
    { label: "Inventory turnover", score: 58, weight: 0.15, note: "14 SKUs aging past 90 days" },
    { label: "Data freshness", score: 92, weight: 0.1, note: "5 of 6 datasets synced this week" },
  ],
  history: [
    { label: "Jun", score: 66 },
    { label: "Jul", score: 69 },
    { label: "Aug", score: 68 },
    { label: "Sep", score: 72 },
    { label: "Oct", score: 74 },
    { label: "Nov", score: 78 },
  ],
};

export const mockDashboardKpis: Kpi[] = [
  {
    id: "revenue",
    label: "Revenue",
    value: 84260,
    format: "currency",
    delta: 12.4,
    goodWhen: "up",
    spark: [52, 58, 55, 61, 66, 63, 70, 74, 72, 79, 81, 84],
    caption: "Month to date",
  },
  {
    id: "margin",
    label: "Gross margin",
    value: 46.2,
    format: "percent",
    delta: 2.1,
    goodWhen: "up",
    spark: [41, 42, 41.5, 43, 42.8, 44, 43.6, 44.8, 45.1, 45.4, 45.9, 46.2],
    caption: "Trailing 30 days",
  },
  {
    id: "opex",
    label: "Operating expenses",
    value: 31480,
    format: "currency",
    delta: -3.8,
    goodWhen: "down",
    spark: [34, 33, 35, 33.5, 32, 33, 32.6, 31.9, 32.4, 31.6, 31.9, 31.5],
    caption: "Month to date",
  },
  {
    id: "runway",
    label: "Cash runway",
    value: 92,
    format: "days",
    delta: 8.2,
    goodWhen: "up",
    spark: [70, 72, 74, 73, 77, 79, 80, 82, 85, 86, 89, 92],
    caption: "At current burn",
  },
];

export const mockRevenueTrend: TrendPoint[] = [
  { label: "Dec", revenue: 61200, expenses: 38900 },
  { label: "Jan", revenue: 48700, expenses: 35100 },
  { label: "Feb", revenue: 52300, expenses: 34800 },
  { label: "Mar", revenue: 58900, expenses: 36200 },
  { label: "Apr", revenue: 62400, expenses: 35900 },
  { label: "May", revenue: 66100, expenses: 37400 },
  { label: "Jun", revenue: 63800, expenses: 36800 },
  { label: "Jul", revenue: 69500, expenses: 35300 },
  { label: "Aug", revenue: 71200, expenses: 34600 },
  { label: "Sep", revenue: 70100, expenses: 33900 },
  { label: "Oct", revenue: 74950, expenses: 32700 },
  { label: "Nov", revenue: 84260, expenses: 31480 },
];

export const mockInsights: Insight[] = [
  {
    id: "i1",
    tone: "positive",
    title: "Weekend sales are carrying growth",
    body: "Saturday revenue is up 23% month over month, driven by the ceramics collection.",
    metric: "+23%",
  },
  {
    id: "i2",
    tone: "warning",
    title: "Shipping costs crept up",
    body: "Freight & shipping is 18% over budget with 9 days left in the month.",
    metric: "118%",
  },
  {
    id: "i3",
    tone: "neutral",
    title: "Linen throws are close to stock-out",
    body: "At the current pace you'll run out in about 6 days. Lead time is 10 days.",
    metric: "6 days",
  },
];

export const mockTopCategories: CategoryValue[] = [
  { label: "Ceramics & tableware", value: 28640 },
  { label: "Textiles & linen", value: 19820 },
  { label: "Candles & fragrance", value: 14310 },
  { label: "Furniture accents", value: 12090 },
  { label: "Stationery", value: 9400 },
];

export const mockStockAlerts = [
  { sku: "TX-1042", name: "Stonewashed linen throw · Sage", onHand: 6, reorderPoint: 20, status: "low" as const },
  { sku: "CR-2210", name: "Speckled stoneware mug", onHand: 0, reorderPoint: 36, status: "out" as const },
  { sku: "CN-0381", name: "Cedar & smoke candle 8oz", onHand: 11, reorderPoint: 24, status: "low" as const },
];
