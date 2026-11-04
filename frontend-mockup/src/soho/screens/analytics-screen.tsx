import { CalendarRange, Download, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "../components/button";
import { ChartLegend, DonutChart, Sparkline, TrendChart, chartColors, type SeriesDef } from "../components/charts";
import { DataTable, type Column } from "../components/data-table";
import { Select } from "../components/form";
import { Delta, Meter, PageHeader } from "../components/misc";
import { Panel, PanelBody, PanelHeader } from "../components/panel";
import { formatCurrency, formatNumber, formatPercent, formatValue } from "../lib/format";
import type { CategoryValue, TrendPoint } from "../types";

type MetricId = "revenue" | "orders" | "aov" | "customers";

export interface AnalyticsScreenProps {
  metrics: { id: MetricId; label: string; value: number; format: "currency" | "number"; delta: number }[];
  series: Record<MetricId, TrendPoint[]>;
  channelMix: CategoryValue[];
  heatmap: { days: string[]; blocks: string[]; values: number[][] };
  products: { id: string; name: string; category: string; revenue: number; units: number; margin: number; trend: number[] }[];
  targets: { label: string; actual: number; target: number; format: "currency" | "percent" | "number" }[];
}

export function AnalyticsScreen({ metrics, series, channelMix, heatmap, products, targets }: AnalyticsScreenProps) {
  const [metric, setMetric] = useState<MetricId>("revenue");
  const active = metrics.find((m) => m.id === metric)!;
  const totalChannel = channelMix.reduce((s, c) => s + c.value, 0);
  const lineSeries: SeriesDef[] = [
    { key: "current", label: "This period", color: "var(--chart-1)" },
    { key: "previous", label: "Previous period", color: "var(--chart-4)", kind: "line" },
  ];

  const productColumns: Column<AnalyticsScreenProps["products"][number]>[] = [
    {
      key: "name",
      header: "Product",
      cell: (p) => (
        <div>
          <p className="font-medium text-foreground">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.category}</p>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    { key: "revenue", header: "Revenue", align: "right", cell: (p) => <span className="num">{formatCurrency(p.revenue)}</span>, sortValue: (p) => p.revenue },
    { key: "units", header: "Units", align: "right", hideBelow: "sm", cell: (p) => <span className="num">{formatNumber(p.units)}</span>, sortValue: (p) => p.units },
    {
      key: "margin",
      header: "Margin",
      align: "right",
      hideBelow: "md",
      cell: (p) => (
        <span className={cn("num", p.margin >= 50 ? "text-success" : "text-foreground")}>{formatPercent(p.margin)}</span>
      ),
      sortValue: (p) => p.margin,
    },
    {
      key: "trend",
      header: "7-week trend",
      align: "right",
      hideBelow: "lg",
      cell: (p) => (
        <Sparkline
          values={p.trend}
          width={80}
          height={24}
          fill={false}
          color={p.trend[p.trend.length - 1] >= p.trend[0] ? "var(--chart-3)" : "var(--chart-5)"}
          className="ml-auto"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow="Analytics"
        title="Sales performance"
        description="Compare periods, spot patterns, and see what's driving results."
        actions={
          <>
            <Button>
              <CalendarRange /> Sep 1 – Nov 30
            </Button>
            <Button variant="primary">
              <Download /> Export
            </Button>
          </>
        }
      />

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <SlidersHorizontal className="size-4" /> Filters
        </span>
        <Select size_="sm" aria-label="Location" defaultValue="all" className="w-40">
          <option value="all">All locations</option>
          <option>Front store</option>
          <option>Online shop</option>
        </Select>
        <Select size_="sm" aria-label="Category" defaultValue="all" className="w-40">
          <option value="all">All categories</option>
          <option>Ceramics</option>
          <option>Textiles</option>
        </Select>
        <Select size_="sm" aria-label="Compare to" defaultValue="prev" className="w-48">
          <option value="prev">Compare: previous period</option>
          <option value="yoy">Compare: same period last year</option>
        </Select>
      </div>

      {/* Metric switcher + main chart in one panel */}
      <Panel>
        <div role="tablist" aria-label="Metric" className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
          {metrics.map((m) => {
            const selected = m.id === metric;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setMetric(m.id)}
                className={cn(
                  "relative px-5 py-4 text-left transition-colors first:rounded-tl-2xl lg:last:rounded-tr-2xl",
                  "border-border not-last:border-r max-lg:nth-[2]:border-r-0 max-lg:nth-[-n+2]:border-b",
                  selected ? "bg-surface" : "bg-surface-sunken/50 hover:bg-surface-sunken",
                )}
              >
                {selected && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary" />}
                <p className={cn("text-xs font-medium", selected ? "text-primary" : "text-muted-foreground")}>{m.label}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="num text-xl font-semibold text-foreground">{formatValue(m.value, m.format)}</span>
                  <Delta value={m.delta} />
                </div>
              </button>
            );
          })}
        </div>
        <PanelBody className="pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Weekly {active.label.toLowerCase()} · 13 weeks
            </p>
            <ChartLegend series={lineSeries} />
          </div>
          <TrendChart
            data={series[metric]}
            series={lineSeries}
            height={300}
            valueKind={active.format}
            ariaLabel={`Weekly ${active.label} for this period compared with the previous period`}
          />
        </PanelBody>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-5">
          <PanelHeader title="Revenue by channel" description="Share of total for the selected period" />
          <PanelBody className="flex flex-col items-center gap-6 sm:flex-row">
            <DonutChart data={channelMix} centerLabel="Total" centerValue={formatCurrency(totalChannel, { compact: true })} size={170} />
            <ul className="w-full flex-1 space-y-3">
              {channelMix.map((c, i) => (
                <li key={c.label} className="flex items-center gap-3 text-sm">
                  <span aria-hidden className="size-2.5 rounded-sm" style={{ background: chartColors[i] }} />
                  <span className="flex-1 text-foreground">{c.label}</span>
                  <span className="num text-muted-foreground">{formatPercent(c.share ?? 0)}</span>
                  <span className="num w-20 text-right font-medium text-foreground">{formatCurrency(c.value, { compact: true })}</span>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-7">
          <PanelHeader title="When customers buy" description="Revenue intensity by weekday and time of day" />
          <PanelBody>
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[420px] border-separate border-spacing-1 text-xs">
                <caption className="sr-only">Heatmap of revenue intensity by weekday and time block</caption>
                <thead>
                  <tr>
                    <th className="w-10" />
                    {heatmap.blocks.map((b) => (
                      <th key={b} scope="col" className="num pb-1 font-normal text-muted-foreground">
                        {b}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.days.map((d, di) => (
                    <tr key={d}>
                      <th scope="row" className="pr-2 text-left font-medium text-muted-foreground">
                        {d}
                      </th>
                      {heatmap.values[di].map((v, bi) => (
                        <td key={bi} className="p-0">
                          <div
                            className="num flex h-9 items-center justify-center rounded-md text-[0.65rem] font-medium"
                            style={{
                              background: `color-mix(in oklab, var(--chart-1) ${Math.max(6, v)}%, var(--surface-sunken))`,
                              color: v > 55 ? "var(--primary-foreground)" : "var(--muted-foreground)",
                            }}
                            title={`${d} ${heatmap.blocks[bi]}: ${v}`}
                          >
                            {v}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
              Quieter
              <span
                aria-hidden
                className="h-2 w-24 rounded-full"
                style={{ background: "linear-gradient(90deg, var(--surface-sunken), var(--chart-1))" }}
              />
              Busier
            </div>
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <PanelHeader title="Product performance" description="Top sellers this period" />
          <DataTable caption="Product performance" rows={products} columns={productColumns} getRowId={(p) => p.id} />
        </Panel>
        <Panel className="lg:col-span-4">
          <PanelHeader title="Targets" description="Progress toward this month's goals" />
          <PanelBody>
            <ul className="space-y-5">
              {targets.map((t) => {
                const pct = (t.actual / t.target) * 100;
                const fmt = (v: number) =>
                  t.format === "currency" ? formatCurrency(v, { compact: true }) : t.format === "percent" ? formatPercent(v) : `${v.toFixed(1)}×`;
                return (
                  <li key={t.label}>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className="font-medium text-foreground">{t.label}</span>
                      <span className={cn("num text-xs font-medium", pct >= 100 ? "text-success" : "text-muted-foreground")}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <Meter value={Math.min(t.actual, t.target)} max={t.target} tone={pct >= 100 ? "success" : pct >= 85 ? "primary" : "warning"} label={`${t.label} progress`} />
                    <p className="num mt-1 text-xs text-muted-foreground">
                      {fmt(t.actual)} of {fmt(t.target)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
