import { ArrowRight, Download, Lightbulb, PackageX, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { BarList, ChartLegend, Sparkline, TrendChart, type SeriesDef } from "../components/charts";
import { HealthGauge } from "../components/health-gauge";
import { Delta, Meter, PageHeader, Segmented } from "../components/misc";
import { Panel, PanelBody, PanelHeader } from "../components/panel";
import { formatValue } from "../lib/format";
import { AppLink } from "../router-adapter";
import type { ActivityEvent, CategoryValue, HealthScore, Insight, Kpi, TrendPoint } from "../types";

export interface DashboardScreenProps {
  userFirstName: string;
  businessName: string;
  dateLabel: string;
  health: HealthScore;
  kpis: Kpi[];
  revenueTrend: TrendPoint[];
  insights: Insight[];
  topCategories: CategoryValue[];
  stockAlerts: { sku: string; name: string; onHand: number; reorderPoint: number; status: "low" | "out" }[];
  recentActivity: ActivityEvent[];
  onExport?: () => void;
}

type Range = "7d" | "30d" | "qtd" | "ytd";

const trendSeries: SeriesDef[] = [
  { key: "revenue", label: "Revenue", color: "var(--chart-1)" },
  { key: "expenses", label: "Expenses", color: "var(--chart-2)", kind: "line" },
];

const insightIcon = { positive: TrendingUp, warning: TriangleAlert, neutral: Lightbulb };
const insightTone = {
  positive: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  neutral: "bg-info-soft text-info",
};

export function DashboardScreen(props: DashboardScreenProps) {
  const { health, kpis, revenueTrend, insights, topCategories, stockAlerts, recentActivity } = props;
  const [range, setRange] = useState<Range>("30d");

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={props.dateLabel}
        title={`Good afternoon, ${props.userFirstName}`}
        description={`Here's how ${props.businessName} is doing. Numbers update when your datasets sync.`}
        actions={
          <>
            <Segmented
              label="Date range"
              value={range}
              onChange={setRange}
              options={[
                { value: "7d", label: "7D" },
                { value: "30d", label: "30D" },
                { value: "qtd", label: "QTD" },
                { value: "ytd", label: "YTD" },
              ]}
            />
            <Button onClick={props.onExport}>
              <Download /> Export
            </Button>
          </>
        }
      />

      {/* Hero: Health score + revenue trend */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-5">
          <PanelHeader
            eyebrow="Business health"
            title="Your health score"
            actions={
              <Badge tone="success">
                <TrendingUp className="size-3" /> +{health.change} this month
              </Badge>
            }
          />
          <PanelBody>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <div className="flex flex-col items-center">
                <HealthGauge score={health.score} band={health.band} size={210} />
                <div className="mt-3 flex items-end gap-1" aria-label="Score history, last six months">
                  {health.history.map((h, i) => (
                    <div key={h.label} className="flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "w-5 rounded-sm",
                          i === health.history.length - 1 ? "bg-primary" : "bg-primary/20",
                        )}
                        style={{ height: `${(h.score - 50) * 1.1}px` }}
                        title={`${h.label}: ${h.score}`}
                      />
                      <span className="text-[0.6rem] text-muted-foreground">{h.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full min-w-0 flex-1">
                <p className="text-sm text-foreground/80">{health.summary}</p>
                <ul className="mt-4 space-y-3">
                  {health.factors.map((f) => (
                    <li key={f.label}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium text-foreground">{f.label}</span>
                        <span className="num text-xs text-muted-foreground">{f.score}</span>
                      </div>
                      <Meter value={f.score} tone="auto" label={`${f.label} score`} />
                      <p className="mt-1 text-xs text-muted-foreground">{f.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </PanelBody>
        </Panel>

        <Panel className="flex flex-col xl:col-span-7">
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
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-soft sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.id} className="flex items-end justify-between gap-4 bg-surface p-5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              <p className="num mt-1.5 text-2xl font-semibold text-foreground">{formatValue(k.value, k.format)}</p>
              <div className="mt-2 flex items-center gap-2">
                <Delta value={k.delta} goodWhen={k.goodWhen} suffix="vs. last period" />
                <span className="text-xs text-muted-foreground">{k.caption}</span>
              </div>
            </div>
            <Sparkline
              values={k.spark}
              width={88}
              height={36}
              color={i % 2 === 0 ? "var(--chart-1)" : "var(--chart-3)"}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-12">
        <Panel className="xl:col-span-5">
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
        </Panel>

        <Panel className="xl:col-span-4">
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
        </Panel>

        <Panel className="lg:col-span-2 xl:col-span-3">
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
        </Panel>
      </div>

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
              <p className="text-xs text-muted-foreground">
                {a.day} · {a.time}
              </p>
              <p className="mt-1 text-sm text-foreground">
                <span className="font-medium">{a.actor}</span> {a.action}{" "}
                <span className="font-medium">{a.target}</span>
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
