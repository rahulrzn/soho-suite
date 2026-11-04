import { ArrowRight, Lightbulb, PackageX, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import { Badge } from "../components/badge";
import { BarList, ChartLegend, Sparkline, TrendChart, type SeriesDef } from "../components/charts";
import { HealthGauge } from "../components/health-gauge";
import { Delta, Meter, PageHeader } from "../components/misc";
import { Panel, PanelBody, PanelHeader } from "../components/panel";
import { LoadingLine } from "../../components/Feedback";
import { formatValue } from "../lib/format";
import { AppLink } from "../router-adapter";
import type { CategoryValue, DashboardActivityEvent, HealthScore, Insight, Kpi, TrendPoint } from "../types";

export interface DashboardScreenProps {
  userFirstName: string;
  businessName: string;
  dateLabel: string;
  health: HealthScore | null;
  healthUnavailableReason?: string | null;
  healthFactors?: { label: string; score: number | null; note: string; status: string }[];
  kpis: Kpi[];
  revenueTrend: TrendPoint[];
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

export function DashboardScreen(props: DashboardScreenProps) {
  const { health, kpis, revenueTrend, insights, topCategories, stockAlerts, recentActivity } = props;
  const history = health?.history ?? [];
  const healthFactors = props.healthFactors ?? health?.factors?.map((factor) => ({ ...factor, status: "AVAILABLE" })) ?? [];
  const trendSeries = props.trendSeries ?? [{ key: "revenue", label: "Sales", color: "var(--chart-1)" }];
  const header = <PageHeader
    eyebrow={props.dateLabel}
    title={`Good afternoon, ${props.userFirstName}`}
    description={`Here's how ${props.businessName} is doing. Scores use confirmed sales and recorded expenses.`}
    actions={props.rangeControl}
  />;

  return (
    <div className="space-y-6">
      {header}
      {props.refreshing ? <section className="content-panel panel-pad" role="status"><LoadingLine text="Updating dashboard for the selected date range…" /></section> : <>

      {/* Hero: Health score + revenue trend */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Panel className="border-t-2 border-t-success xl:col-span-6 2xl:col-span-5">
          <PanelHeader
            eyebrow="Business health"
            title="Your health score"
            actions={health?.change !== undefined ? <Badge tone={health.change >= 0 ? "success" : "warning"}><TrendingUp className="size-3" /> {health.change > 0 ? "+" : ""}{health.change} this month</Badge> : undefined}
          />
          <PanelBody>
            {!health ? <div className="min-w-0">
              <div className="flex items-start gap-4 border-b border-border pb-4">
                <span aria-hidden="true" className="num mt-0.5 text-3xl font-semibold leading-none text-muted-foreground">—</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Score unavailable</p>
                  <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">{props.healthUnavailableReason ?? "A health score is not available for this date range yet."}</p>
                </div>
              </div>
              {!!healthFactors.length && <HealthFactorList className="grid gap-x-6 gap-y-4 sm:grid-cols-2" factors={healthFactors} />}
            </div> :
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <div className="flex flex-col items-center">
                <HealthGauge score={health.score} band={health.band} size={210} />
                {health.history?.length ? <div className="mt-3 flex items-end gap-1" aria-label="Score history">
                  {history.map((h, i) => (
                    <div key={h.label} className="flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "w-5 rounded-sm",
                          i === history.length - 1 ? "bg-primary" : "bg-primary/20",
                        )}
                        style={{ height: `${(h.score - 50) * 1.1}px` }}
                        title={`${h.label}: ${h.score}`}
                      />
                      <span className="text-[0.6rem] text-muted-foreground">{h.label}</span>
                    </div>
                  ))}
                </div> : null}
              </div>
              <div className="w-full min-w-0 flex-1">
                {health.summary && <p className="text-sm text-foreground/80">{health.summary}</p>}
                {!!healthFactors.length && <HealthFactorList factors={healthFactors} />}
              </div>
            </div>}
          </PanelBody>
        </Panel>

        <Panel className="flex flex-col border-t-2 border-t-primary xl:col-span-6 2xl:col-span-7">
          <PanelHeader
            eyebrow="Performance"
            title="Revenue vs. expenses"
            description="Last 12 months"
            actions={<ChartLegend series={trendSeries} />}
          />
          <PanelBody className="flex-1">
            <TrendChart
              data={revenueTrend}
              series={trendSeries}
              height={300}
              ariaLabel="Line chart of monthly revenue versus expenses for the last 12 months"
            />
          </PanelBody>
        </Panel>
      </div>

      {/* KPI strip — one surface, divided */}
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const metricColor = ["var(--chart-1)", "var(--chart-4)", "var(--chart-2)", "var(--chart-3)"][i % 4];
          return (
          <div key={k.id} className="flex items-start justify-between gap-4 bg-surface p-5">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: metricColor }} />{k.label}</p>
              <p className="num mt-1.5 text-2xl font-semibold text-foreground">{k.value === null ? "—" : formatValue(k.value, k.format)}</p>
              {(k.delta !== null || k.caption || k.reason) && <div className="mt-2 flex flex-wrap items-center gap-2">
                {k.delta !== null && k.goodWhen && <Delta value={k.delta} goodWhen={k.goodWhen} suffix="vs. previous period" />}
                {k.caption && <span className="text-xs text-muted-foreground">{k.caption}</span>}
                {k.reason && <span className="text-xs text-muted-foreground">{k.reason}</span>}
              </div>}
            </div>
            {!!k.spark?.length && <Sparkline
              values={k.spark}
              width={88}
              height={36}
              color={metricColor}
            />}
          </div>
        )})}
      </div>

      {(insights.length > 0 || topCategories.length > 0 || stockAlerts.length > 0) && <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-12">
        {insights.length > 0 && <Panel className="xl:col-span-5">
          <PanelHeader
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent-foreground" /> What changed
              </span>
            }
            description="Plain-language highlights from your data"
          />
          <ul className="divide-y divide-border border-t border-border">
            {insights.map((ins) => {
              const Icon = insightIcon[ins.tone];
              return (
                <li key={ins.id} className="flex gap-3 px-5 py-4">
                  <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-xl", insightTone[ins.tone])}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{ins.title}</p>
                      {ins.metric && <span className="num shrink-0 text-sm font-semibold text-foreground">{ins.metric}</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{ins.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>}

        {topCategories.length > 0 && <Panel className="xl:col-span-4">
          <PanelHeader
            title="Top categories"
            description="Revenue, month to date"
            actions={
              <AppLink to="/analytics" className="text-sm font-medium text-primary hover:underline">
                Details
              </AppLink>
            }
          />
          <PanelBody>
            <BarList items={topCategories} />
          </PanelBody>
        </Panel>}

        {stockAlerts.length > 0 && <Panel className="lg:col-span-2 xl:col-span-3">
          <PanelHeader title="Needs attention" description="Stock below reorder point" />
          <ul className="space-y-2 px-5 pb-4">
            {stockAlerts.map((s) => (
              <li key={s.sku} className="rounded-xl border border-border bg-surface-sunken/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="num text-xs text-muted-foreground">{s.sku}</p>
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
                  <Meter value={s.onHand} max={s.reorderPoint} tone={s.status === "out" ? "danger" : "warning"} label={`${s.name} stock`} />
                  <span className="num shrink-0 text-xs text-muted-foreground">
                    {s.onHand}/{s.reorderPoint}
                  </span>
                </div>
              </li>
            ))}
            <li>
              <AppLink
                to="/inventory"
                className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-primary hover:bg-primary-soft/50"
              >
                Review inventory <ArrowRight className="size-4" />
              </AppLink>
            </li>
          </ul>
        </Panel>}
      </div>}

      <Panel>
        <PanelHeader
          title="Recent activity"
          actions={
            <AppLink to="/activity" className="text-sm font-medium text-primary hover:underline">
              View all
            </AppLink>
          }
        />
        <ul className="grid gap-px border-t border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {recentActivity.slice(0, 4).map((a) => (
            <li key={a.id} className="bg-surface px-5 py-4">
              {a.day && a.time && <p className="text-xs text-muted-foreground">{a.day} · {a.time}</p>}
              <p className="mt-1 text-sm text-foreground">{a.summary ?? <><span className="font-medium">{a.actor}</span> {a.action} <span className="font-medium">{a.target}</span></>}</p>
              {a.detail && <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>}
            </li>
          ))}
        </ul>
      </Panel>
      </>}
    </div>
  );
}

function HealthFactorList({ factors, className = "mt-4 space-y-3" }: { factors: { label: string; score: number | null; note: string; status: string }[]; className?: string }) {
  return <ul className={cn("mt-4", className)}>
    {factors.map((factor) => <li key={factor.label}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{factor.label}</span>
        <span className="num text-xs text-muted-foreground">{factor.score ?? 'Unavailable'}</span>
      </div>
      {factor.score !== null && <Meter value={factor.score} tone="auto" label={`${factor.label} score`} />}
      <p className="mt-1 text-xs text-muted-foreground">{factor.note || factor.status.toLowerCase()}</p>
    </li>)}
  </ul>
}
