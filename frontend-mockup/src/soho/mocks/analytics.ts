/** MOCK DATA — visual prototype only. */
import type { CategoryValue, TrendPoint } from "../types";

export type AnalyticsMetric = "revenue" | "orders" | "aov" | "customers";

export const mockAnalyticsMetrics: {
  id: AnalyticsMetric;
  label: string;
  value: number;
  format: "currency" | "number";
  delta: number;
}[] = [
  { id: "revenue", label: "Revenue", value: 248310, format: "currency", delta: 14.2 },
  { id: "orders", label: "Orders", value: 3412, format: "number", delta: 9.6 },
  { id: "aov", label: "Avg. order value", value: 72.8, format: "currency", delta: 4.1 },
  { id: "customers", label: "Active customers", value: 1986, format: "number", delta: -1.8 },
];

const weeks = ["W36", "W37", "W38", "W39", "W40", "W41", "W42", "W43", "W44", "W45", "W46", "W47", "W48"];
const base = {
  revenue: [15200, 16100, 15800, 17400, 18100, 17600, 19200, 20300, 19700, 21400, 22800, 21900, 23100],
  orders: [212, 225, 219, 240, 251, 243, 262, 278, 270, 291, 309, 300, 316],
  aov: [71.7, 71.6, 72.1, 72.5, 72.1, 72.4, 73.3, 73.0, 72.9, 73.5, 73.8, 73.0, 73.1],
  customers: [1420, 1460, 1432, 1490, 1512, 1488, 1530, 1561, 1544, 1590, 1612, 1580, 1606],
};
const prev = {
  revenue: [13900, 14200, 14600, 15100, 15400, 15800, 16200, 16900, 17100, 17800, 18600, 19000, 19800],
  orders: [198, 203, 207, 214, 219, 224, 229, 238, 241, 250, 261, 266, 276],
  aov: [70.2, 70.0, 70.5, 70.6, 70.3, 70.5, 70.7, 71.0, 70.9, 71.2, 71.3, 71.4, 71.7],
  customers: [1480, 1495, 1502, 1520, 1534, 1540, 1556, 1570, 1581, 1602, 1620, 1631, 1645],
};

export const mockAnalyticsSeries: Record<AnalyticsMetric, TrendPoint[]> = Object.fromEntries(
  (Object.keys(base) as AnalyticsMetric[]).map((k) => [
    k,
    weeks.map((w, i) => ({ label: w, current: base[k][i], previous: prev[k][i] })),
  ]),
) as Record<AnalyticsMetric, TrendPoint[]>;

export const mockChannelMix: CategoryValue[] = [
  { label: "In-store", value: 118400, share: 47.7 },
  { label: "Online shop", value: 84200, share: 33.9 },
  { label: "Wholesale", value: 31500, share: 12.7 },
  { label: "Markets & pop-ups", value: 14210, share: 5.7 },
];

/** Revenue intensity by weekday × time block, 0–100 */
export const mockHeatmap = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  blocks: ["9–11", "11–1", "1–3", "3–5", "5–7", "7–9"],
  values: [
    [12, 24, 31, 28, 22, 8],
    [14, 27, 33, 30, 25, 10],
    [16, 30, 36, 34, 29, 12],
    [18, 34, 40, 38, 36, 18],
    [22, 41, 48, 52, 58, 34],
    [46, 78, 92, 88, 70, 38],
    [38, 66, 74, 61, 42, 16],
  ],
};

export const mockProductPerformance = [
  { id: "p1", name: "Speckled stoneware mug", category: "Ceramics", revenue: 18420, units: 614, margin: 58.2, trend: [8, 9, 11, 10, 13, 14, 16] },
  { id: "p2", name: "Stonewashed linen throw", category: "Textiles", revenue: 15960, units: 133, margin: 44.1, trend: [12, 11, 13, 15, 14, 17, 18] },
  { id: "p3", name: "Cedar & smoke candle 8oz", category: "Fragrance", revenue: 11280, units: 470, margin: 61.5, trend: [9, 10, 9, 11, 12, 11, 13] },
  { id: "p4", name: "Walnut serving board", category: "Furniture", revenue: 9870, units: 141, margin: 39.8, trend: [7, 8, 7, 7, 6, 8, 7] },
  { id: "p5", name: "Hand-bound linen journal", category: "Stationery", revenue: 6120, units: 255, margin: 52.0, trend: [6, 5, 6, 5, 4, 5, 4] },
];

export const mockTargets = [
  { label: "Monthly revenue", actual: 84260, target: 90000, format: "currency" as const },
  { label: "Gross margin", actual: 46.2, target: 45, format: "percent" as const },
  { label: "Repeat customer rate", actual: 31.4, target: 35, format: "percent" as const },
  { label: "Inventory turnover", actual: 3.1, target: 4, format: "number" as const },
];
