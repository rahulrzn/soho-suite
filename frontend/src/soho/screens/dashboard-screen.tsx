import {
  Activity,
  Boxes,
  Database,
  FileText,
  Lightbulb,
  PackageX,
  Receipt,
  Settings2,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "../../lib/utils";
import { Badge } from "../components/badge";
import { BarList, ChartLegend, Sparkline, TrendChart, type SeriesDef } from "../components/charts";
import { HealthGauge } from "../components/health-gauge";
import { Delta, Meter, PageHeader } from "../components/misc";
import { Panel, PanelBody, PanelHeader } from "../components/panel";
import { LoadingLine } from "../../components/Feedback";
import { formatValue } from "../lib/format";
import { getVisibleSeriesKeys, toggleHiddenSeries } from "../lib/seriesVisibility";
import { AppLink } from "../router-adapter";
import type { CategoryValue, DashboardActivityEvent, HealthScore, Insight, Kpi, TrendPoint } from "../types";

export interface DashboardScreenProps {
  userFirstName: string;
  businessName: string;
  dateLabel: string;
  currencyCode?: string | null;
  health: HealthScore | null;
  healthUnavailableReason?: string | null;
  healthFactors?: { label: string; score: number | null; note: string; status: string }[];
  dataFreshness?: { label: string; score: number | null; note: string; status: string } | null;
  salesAvailability?: { kind: "available" | "unavailable" | "incomplete" | "no-dataset"; reasons: string[] };
  kpis: Kpi[];
  revenueTrend: TrendPoint[];
  revenueTrendUnavailableReason?: string | null;
  insights: Insight[];
  topCategories: CategoryValue[];
  stockAlerts: { sku: string; name: string; onHand: number; reorderPoint: number; status: "low" | "out" }[];
  recentActivity: DashboardActivityEvent[];
  rangeControl?: ReactNode;
  trendSeries?: SeriesDef[];
  refreshing?: boolean;
}

const insightIcon = { positive: TrendingUp, warning: TriangleAlert, neutral: Lightbulb };
const insightTone = {
  positive: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  neutral: "bg-info-soft text-info",
};

// Curated realistic SMB demo dataset for interactive simulation
const DEMO_KPIS: Kpi[] = [
  { id: "revenue", label: "Revenue", value: 148920, format: "currency", delta: 14.2, goodWhen: "up", spark: [38, 44, 49, 58, 62, 59, 71, 78, 86, 94] },
  { id: "orders", label: "Orders", value: 1428, format: "number", delta: 8.6, goodWhen: "up", spark: [110, 118, 122, 128, 134, 131, 142, 148, 156, 164] },
  { id: "aov", label: "Average order value", value: 104.28, format: "currency", delta: 5.1, goodWhen: "up", spark: [92, 94, 96, 95, 99, 101, 102, 103, 104, 104] },
  { id: "customers", label: "Customers", value: 982, format: "number", delta: 18.4, goodWhen: "up", spark: [620, 660, 710, 750, 790, 830, 880, 920, 950, 982] },
];

const DEMO_HEALTH: HealthScore = {
  score: 87,
  band: "Thriving",
  change: 4,
  summary: "Operating efficiency is in the 88th percentile with strong cash flow retention and stable monthly sales momentum.",
  factors: [
    { label: "Operating margin", score: 92, weight: 0.35, note: "26.4% net margin after COGS, overhead, and operating spend" },
    { label: "Revenue consistency", score: 88, weight: 0.25, note: "Steady transaction velocity across both weekday and weekend channels" },
    { label: "Cash flow stability", score: 84, weight: 0.25, note: "Operating reserves cover 4.8 months of fixed overhead" },
    { label: "Data freshness", score: 96, weight: 0.15, note: "Sales and expense ledgers synchronized 4 minutes ago" },
  ],
  history: [
    { label: "Jun", score: 78 },
    { label: "Jul", score: 80 },
    { label: "Aug", score: 82 },
    { label: "Sep", score: 85 },
    { label: "Oct", score: 87 },
  ],
};

const DEMO_TREND: TrendPoint[] = [
  { label: "Jan", revenue: 12400, expenses: 8200 },
  { label: "Feb", revenue: 14200, expenses: 8900 },
  { label: "Mar", revenue: 13800, expenses: 9100 },
  { label: "Apr", revenue: 15600, expenses: 9400 },
  { label: "May", revenue: 17200, expenses: 10100 },
  { label: "Jun", revenue: 18900, expenses: 10400 },
  { label: "Jul", revenue: 19800, expenses: 11200 },
  { label: "Aug", revenue: 21400, expenses: 11800 },
  { label: "Sep", revenue: 22900, expenses: 12400 },
  { label: "Oct", revenue: 24800, expenses: 12900 },
];

const DEMO_INSIGHTS: Insight[] = [
  { id: "1", tone: "positive", title: "Operating margin expansion", body: "Net operating margin widened by 3.8% this quarter following supplier renegotiations.", metric: "+3.8%" },
  { id: "2", tone: "positive", title: "Customer repeat purchase rate", body: "34.2% of fulfilled orders this month came from returning customers within 90 days.", metric: "34.2%" },
  { id: "3", tone: "neutral", title: "Inventory turnover velocity", body: "Annualized turnover is 6.4x, well above the 4.5x benchmark for specialty retail.", metric: "6.4x" },
];

const DEMO_CATEGORIES: CategoryValue[] = [
  { label: "Apparel & Outerwear", value: 56589, share: 0.38 },
  { label: "Leather Goods & Bags", value: 38719, share: 0.26 },
  { label: "Footwear & Boots", value: 31273, share: 0.21 },
  { label: "Care & Accessories", value: 22339, share: 0.15 },
];

const DEMO_STOCK_ALERTS: { sku: string; name: string; onHand: number; reorderPoint: number; status: "low" | "out" }[] = [
  { sku: "SKU-1049", name: "Oxford Leather Boot", onHand: 3, reorderPoint: 15, status: "low" },
  { sku: "SKU-2041", name: "Merino Wool Knit", onHand: 0, reorderPoint: 20, status: "out" },
];

const DEMO_ACTIVITY: DashboardActivityEvent[] = [
  { id: "d1", actor: "Kiseki Tempest", action: "imported sales dataset", target: "orders_q3_2026.csv", module: "Datasets", day: "Today", time: "2:14 PM" },
  { id: "d2", actor: "Kiseki Tempest", action: "recorded operational expense", target: "Office Lease ($3,400)", module: "Expenses", day: "Yesterday", time: "11:30 AM" },
  { id: "d3", actor: "System", action: "flagged low stock reorder threshold", target: "Oxford Leather Boot", module: "Inventory", day: "Nov 3", time: "9:15 AM" },
  { id: "d4", actor: "Kiseki Tempest", action: "exported performance telemetry", target: "Q3 Analytics CSV", module: "Reports", day: "Nov 1", time: "4:45 PM" },
];

export function DashboardScreen(props: DashboardScreenProps) {
  // Allow interactive simulation toggle so users can preview the dashboard fully populated
  const [demoMode, setDemoMode] = useState(false);

  const isLiveEmpty = props.kpis.every((k) => k.value === null);

  const activeKpis = demoMode ? DEMO_KPIS : props.kpis;
  const activeHealth = demoMode ? DEMO_HEALTH : props.health;
  const activeTrend = demoMode ? DEMO_TREND : props.revenueTrend;
  const activeInsights = demoMode ? DEMO_INSIGHTS : props.insights;
  const activeCategories = demoMode ? DEMO_CATEGORIES : props.topCategories;
  const activeStock = demoMode ? DEMO_STOCK_ALERTS : props.stockAlerts;
  const activeActivity = demoMode ? DEMO_ACTIVITY : props.recentActivity;

  const healthFactors = activeHealth?.factors ?? (props.healthFactors?.map((f) => ({ ...f, weight: 0.25, score: f.score ?? 0 })) ?? []);
  const trendSeries = props.trendSeries ?? [
    { key: "revenue", label: "Revenue", color: "var(--chart-1)" },
    { key: "expenses", label: "Expenses", color: "var(--chart-2)", kind: "line" as const },
  ];
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const visibleKeys = getVisibleSeriesKeys(trendSeries, hiddenKeys);

  const toggleSeries = (key: string) => {
    setHiddenKeys((prev) => toggleHiddenSeries(prev, trendSeries, key));
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Interactive Demo Simulation Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={demoMode}
        onClick={() => setDemoMode((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer select-none transition-colors",
          demoMode
            ? "border-primary/50 bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20"
            : "border-border bg-surface text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
        )}
      >
        <Sparkles className={cn("size-3.5", demoMode ? "text-primary animate-pulse" : "text-muted-foreground")} />
        <span>Demo simulation</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.2 text-[0.62rem] font-bold uppercase",
            demoMode ? "bg-primary text-primary-foreground" : "bg-surface-sunken text-muted-foreground",
          )}
        >
          {demoMode ? "On" : "Off"}
        </span>
      </button>

      {props.rangeControl}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        size="compact"
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium text-xs">
            <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            {props.businessName}
            {demoMode && (
              <span className="ml-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.2 text-[0.65rem] font-semibold text-primary">
                Preview dataset
              </span>
            )}
          </span>
        }
        title="Dashboard"
        description={`Good afternoon, ${props.userFirstName}. Here is your business operating telemetry and performance overview.`}
        actions={headerActions}
      />

      {props.refreshing ? (
        <section className="content-panel panel-pad" role="status">
          <LoadingLine text="Updating dashboard metrics for the selected date range…" />
        </section>
      ) : (
        <>
          {/* Executive Performance Strip */}
          <section
            aria-label="Executive performance indicators"
            className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition-colors hover:border-border-strong"
          >
            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
              {activeKpis.map((k, i) => {
                const metricColor = ["var(--chart-1)", "var(--chart-4)", "var(--chart-2)", "var(--chart-3)"][i % 4];
                const isCurrency = k.format === "currency";

                // Formatted display values (calm zeros if live data is null)
                const displayValue = k.value !== null
                  ? formatValue(k.value, k.format, { currency: props.currencyCode ?? "USD" })
                  : isCurrency
                    ? formatValue(0, "currency", { currency: props.currencyCode ?? "USD" })
                    : "0";

                return (
                  <AppLink
                    key={k.id}
                    to="/analytics"
                    className="group relative flex flex-col justify-between p-5 select-none transition-colors hover:bg-surface-sunken/40"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                          {k.label}
                        </span>
                        {/* Currency badge ONLY on currency metrics! Orders & Customers do NOT have currency! */}
                        {isCurrency ? (
                          <span className="rounded border border-border/80 bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold text-muted-foreground">
                            {props.currencyCode ?? "USD"}
                          </span>
                        ) : k.spark?.length ? (
                          <Sparkline values={k.spark} width={68} height={24} color={metricColor} />
                        ) : null}
                      </div>

                      <div className="mt-3 mb-1">
                        <p className="num text-2xl sm:text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {displayValue}
                        </p>
                        <p className="text-[0.7rem] text-muted-foreground leading-tight mt-0.5">
                          {i === 0
                            ? (k.value !== null ? "Total revenue in period" : "No revenue in selected range")
                            : i === 1
                              ? (k.value !== null ? "Processed order volume" : "No orders in selected range")
                              : i === 2
                                ? (k.value !== null ? "Average order basket size" : "Average per fulfilled order")
                                : (k.value !== null ? "Unique purchasing customers" : "Unique buyers in selected range")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-border/40 text-xs">
                      {k.delta !== null && k.goodWhen ? (
                        <Delta value={k.delta} goodWhen={k.goodWhen} suffix="vs. previous period" />
                      ) : (
                        <span className="text-[0.72rem] text-muted-foreground/70 group-hover:text-foreground transition-colors font-medium">
                          Detailed analytics
                        </span>
                      )}
                      <ArrowUpRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </AppLink>
                );
              })}
            </div>
          </section>

          {/* Subframe-Style Single Onboarding Launchpad: Shown when live workspace has no dataset yet & demo is off */}
          {isLiveEmpty && !demoMode && (
            <section
              aria-label="Workspace Onboarding Checklist"
              className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between pb-6 border-b border-border/60">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2.5">
                    <CheckCircle2 className="size-3.5" />
                    <span>Workspace initialized</span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Get started with {props.businessName}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                    Follow these four operational milestones to connect your business data, automate telemetry, and calculate your live Business Health Score.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDemoMode(true)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 text-xs font-semibold text-foreground hover:bg-surface-sunken hover:border-border-strong transition-colors cursor-pointer shadow-xs"
                  >
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Preview sample store</span>
                  </button>
                  <AppLink
                    to="/datasets"
                    className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary hover:opacity-95 px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-colors"
                  >
                    Import sales data
                  </AppLink>
                </div>
              </div>

              {/* 4 Interactive Milestone Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {[
                  {
                    icon: Database,
                    step: "1. Sales telemetry",
                    title: "Import sales CSV",
                    desc: "Upload POS, Shopify, or custom CSV order rows to compute revenue curves.",
                    cta: "Upload dataset",
                    to: "/datasets" as const,
                  },
                  {
                    icon: Receipt,
                    step: "2. Cost tracking",
                    title: "Record expenses",
                    desc: "Log operational costs, software subscriptions, and rent to evaluate true margins.",
                    cta: "Add expense",
                    to: "/expenses" as const,
                  },
                  {
                    icon: Boxes,
                    step: "3. Inventory control",
                    title: "Catalog products",
                    desc: "Configure SKUs, supplier costs, and automated low-stock reorder points.",
                    cta: "Manage catalog",
                    to: "/inventory" as const,
                  },
                  {
                    icon: Users,
                    step: "4. Collaboration",
                    title: "Invite teammates",
                    desc: "Grant granular Owner, Manager, or Viewer roles to partners and accountants.",
                    cta: "Manage team",
                    to: "/team" as const,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <AppLink
                      key={item.step}
                      to={item.to}
                      className="group flex flex-col justify-between rounded-xl border border-border bg-surface-sunken/30 p-4.5 transition-colors hover:bg-surface select-none"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex size-8.5 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-2xs">
                            <Icon className="size-4" />
                          </span>
                          <span className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider">
                            {item.step}
                          </span>
                        </div>
                        <h3 className="mt-3.5 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
                        <span>{item.cta}</span>
                        <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </AppLink>
                  );
                })}
              </div>

              {/* Gentle preview callout */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-sunken/40 px-4.5 py-3 text-xs">
                <span className="text-muted-foreground">
                  Want to explore how Soho Suite calculates Health Scores, category shares, and margin trends?
                </span>
                <button
                  type="button"
                  onClick={() => setDemoMode(true)}
                  className="font-semibold text-primary hover:underline cursor-pointer shrink-0 text-left sm:text-right"
                >
                  Turn on Demo Simulation →
                </button>
              </div>
            </section>
          )}

          {/* Hero Performance Section: Business Health Score + Revenue vs Expenses (ALWAYS VISIBLE) */}
          <div className="grid gap-6 xl:grid-cols-12">
            {/* Health Score Panel */}
            <Panel className="flex flex-col xl:col-span-5">
              <PanelHeader
                eyebrow="Operating health"
                title="Business health score"
                actions={
                  activeHealth?.change !== undefined ? (
                    <Badge tone={activeHealth.change >= 0 ? "success" : "warning"}>
                      <TrendingUp className="size-3" /> {activeHealth.change > 0 ? "+" : ""}
                      {activeHealth.change} this month
                    </Badge>
                  ) : (
                    <Badge tone="neutral">
                      {activeHealth?.band ?? "Pending assessment"}
                    </Badge>
                  )
                }
              />
              <PanelBody className="flex-1 flex flex-col justify-between">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                  <div className="flex flex-col items-center shrink-0">
                    <HealthGauge
                      score={activeHealth?.score ?? null}
                      band={activeHealth?.band ?? (activeHealth?.score ? "Healthy" : "Pending")}
                      size={200}
                    />
                    {activeHealth?.history?.length ? (
                      <div className="mt-3 flex items-end gap-1.5" aria-label="Score history">
                        {activeHealth.history.map((h, i) => (
                          <div key={h.label} className="flex flex-col items-center gap-1">
                            <div
                              className={cn(
                                "w-5 rounded-xs transition-all",
                                i === (activeHealth.history?.length ?? 1) - 1 ? "bg-primary" : "bg-primary/25",
                              )}
                              style={{ height: `${Math.max(8, (h.score - 40) * 1.1)}px` }}
                              title={`${h.label}: ${h.score}`}
                            />
                            <span className="text-[0.62rem] font-medium text-muted-foreground">{h.label}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="w-full min-w-0 flex-1">
                    {activeHealth?.summary ? (
                      <p className="text-xs sm:text-sm leading-relaxed text-foreground font-medium pb-2 border-b border-border/60">
                        {activeHealth.summary}
                      </p>
                    ) : (
                      <div className="pb-2 border-b border-border/60">
                        <p className="text-xs sm:text-sm font-semibold text-foreground">
                          Pending telemetry evaluation
                        </p>
                        <p className="text-[0.72rem] text-muted-foreground mt-0.5 leading-relaxed">
                          {props.healthUnavailableReason || "Awaiting sales order records to evaluate operating margins, revenue consistency, and cash flow."}
                        </p>
                      </div>
                    )}
                    {!!healthFactors.length && <HealthFactorList factors={healthFactors} />}
                  </div>
                </div>
              </PanelBody>
            </Panel>

            {/* Revenue Analytics Trend Chart */}
            <Panel className="flex flex-col xl:col-span-7">
              <PanelHeader
                eyebrow="Financial trend"
                title="Revenue and expenses"
                description={demoMode ? "Sample annual financial curve" : props.dateLabel}
                actions={activeTrend.length > 0 ? <ChartLegend series={trendSeries} activeKeys={visibleKeys} onToggle={toggleSeries} /> : undefined}
              />
              <PanelBody className="flex-1 flex flex-col justify-center">
                {activeTrend.length > 0 ? (
                  <TrendChart
                    data={activeTrend}
                    series={trendSeries}
                    visibleKeys={visibleKeys}
                    height={300}
                    ariaLabel={`Line chart of revenue versus expenses for ${props.dateLabel}`}
                    currency={props.currencyCode ?? "USD"}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                      <TrendingUp className="size-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">Revenue and expenses trend</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {props.revenueTrendUnavailableReason || "No order-line rows exist in the selected date range."}
                    </p>
                    <div className="mt-4 flex items-center gap-2.5">
                      <AppLink
                        to="/datasets"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-95 shadow-xs transition-colors"
                      >
                        Import sales dataset
                      </AppLink>
                      <button
                        type="button"
                        onClick={() => setDemoMode(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-sunken text-xs font-semibold text-foreground transition-colors cursor-pointer"
                      >
                        <Sparkles className="size-3.5 text-primary" />
                        <span>Preview demo trend</span>
                      </button>
                    </div>
                  </div>
                )}
              </PanelBody>
            </Panel>
          </div>

              {/* Data Freshness Indicator */}
              <section
                aria-label="Data freshness"
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-xs"
              >
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-muted-foreground">
                  <Activity aria-hidden className="size-3.5" />
                </span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span className="font-semibold text-foreground">Data freshness:</span>
                  <span className="text-muted-foreground">
                    {demoMode ? "Demo simulation synchronized in real time." : props.dataFreshness?.note || "Import timing details are up to date."}
                  </span>
                </div>
              </section>

              {/* Secondary Intelligence: Insights, Categories, Stock Alerts */}
              {(activeInsights.length > 0 || activeCategories.length > 0 || activeStock.length > 0) && (
                <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-12">
                  {/* Highlights / Insights */}
                  {activeInsights.length > 0 && (
                    <Panel className="xl:col-span-5">
                      <PanelHeader
                        title={
                          <span className="flex items-center gap-2">
                            <Sparkles className="size-4 text-primary" /> Key highlights
                          </span>
                        }
                        description="Plain-language insights from your data"
                      />
                      <ul className="divide-y divide-border border-t border-border">
                        {activeInsights.map((ins) => {
                          const Icon = insightIcon[ins.tone];
                          return (
                            <li key={ins.id} className="flex gap-3 px-5 py-4 transition-colors hover:bg-surface-sunken/40">
                              <span
                                className={cn(
                                  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg shadow-xs",
                                  insightTone[ins.tone],
                                )}
                              >
                                <Icon className="size-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-3">
                                  <p className="text-sm font-semibold text-foreground">{ins.title}</p>
                                  {ins.metric && (
                                    <span className="num shrink-0 text-xs font-bold text-foreground">
                                      {ins.metric}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{ins.body}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </Panel>
                  )}

                  {/* Top Categories */}
                  {activeCategories.length > 0 && (
                    <Panel className="xl:col-span-4">
                      <PanelHeader
                        title="Top categories"
                        description="Sales distribution by category"
                        actions={
                          <AppLink to="/analytics" className="text-xs font-semibold text-primary hover:underline">
                            Details
                          </AppLink>
                        }
                      />
                      <PanelBody>
                        <BarList items={activeCategories} />
                      </PanelBody>
                    </Panel>
                  )}

                  {/* Stock Alerts */}
                  {activeStock.length > 0 && (
                    <Panel className="lg:col-span-2 xl:col-span-3">
                      <PanelHeader title="Needs attention" description="Inventory below reorder point" />
                      <ul className="space-y-2.5 px-5 pb-5">
                        {activeStock.map((s) => (
                          <li key={s.sku} className="rounded-xl border border-border bg-surface-sunken/40 p-3 shadow-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-foreground">{s.name}</p>
                                <p className="num text-[0.68rem] text-muted-foreground">{s.sku}</p>
                              </div>
                              {s.status === "out" ? (
                                <Badge tone="danger">
                                  <PackageX className="size-3" /> Out
                                </Badge>
                              ) : (
                                <Badge tone="warning">Low</Badge>
                              )}
                            </div>
                            <div className="mt-2.5 flex items-center gap-2">
                              <Meter
                                value={s.onHand}
                                max={s.reorderPoint}
                                tone={s.status === "out" ? "danger" : "warning"}
                                label={`${s.name} stock level`}
                              />
                              <span className="num shrink-0 text-xs font-medium text-muted-foreground">
                                {s.onHand}/{s.reorderPoint}
                              </span>
                            </div>
                          </li>
                        ))}
                        <li>
                          <AppLink
                            to="/inventory"
                            className="flex items-center justify-center rounded-lg py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                          >
                            Review inventory
                          </AppLink>
                        </li>
                      </ul>
                    </Panel>
                  )}
                </div>
              )}

              {/* Recent Activity Timeline */}
              <Panel>
                <PanelHeader
                  title="Recent activity"
                  actions={
                    <AppLink to="/activity" className="text-xs font-semibold text-primary hover:underline">
                      View all activity
                    </AppLink>
                  }
                />
                {activeActivity.length > 0 ? (
                  <ul className="divide-y divide-border border-t border-border">
                    {activeActivity.slice(0, 4).map((a) => (
                      <li key={a.id} className="flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-sunken/40">
                        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground">
                          {activityIcon(a.module)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm leading-relaxed text-foreground">
                            {a.summary ?? (
                              <>
                                <span className="font-semibold">{a.actor}</span> {a.action}{" "}
                                <span className="font-semibold">{a.target}</span>
                              </>
                            )}
                          </p>
                          {a.detail && (
                            <p className="mt-0.5 text-[0.7rem] uppercase tracking-wider font-semibold text-muted-foreground">
                              {a.module}
                            </p>
                          )}
                        </div>
                        {a.day && a.time && (
                          <time className="shrink-0 pt-0.5 text-xs text-muted-foreground font-medium sm:text-xs">
                            {a.day} · {a.time}
                          </time>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-border px-5 py-5 text-xs text-muted-foreground">
                    No recent activity logged in this workspace yet.
                  </p>
                )}
              </Panel>
        </>
      )}
    </div>
  );
}

function activityIcon(module: DashboardActivityEvent["module"]) {
  const Icon =
    module === "Datasets"
      ? Database
      : module === "Expenses"
        ? Receipt
        : module === "Inventory"
          ? Boxes
          : module === "Reports"
            ? FileText
            : module === "Team"
              ? Users
              : Settings2;
  return <Icon aria-hidden className="size-4" />;
}

function HealthFactorList({
  factors,
  className = "mt-4 space-y-2",
}: {
  factors: { label: string; score: number | null; note: string; status?: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("mt-4 space-y-1.5", className)}>
      {factors.map((factor) => (
        <li
          key={factor.label}
          className="group rounded-lg p-2 transition-all hover:bg-surface-sunken/70"
        >
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {factor.label}
            </span>
            <span className="num font-bold text-muted-foreground group-hover:text-foreground transition-colors">
              {factor.score !== null ? `${factor.score}/100` : "Awaiting data"}
            </span>
          </div>
          {factor.score !== null && <Meter value={factor.score} tone="auto" label={`${factor.label} score`} />}
          <p className="mt-1 text-[0.72rem] text-muted-foreground leading-relaxed">
            {factor.note || (factor.status ? factor.status.toLowerCase() : "")}
          </p>
        </li>
      ))}
    </ul>
  );
}
