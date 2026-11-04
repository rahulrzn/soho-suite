/* eslint-disable react-refresh/only-export-components -- Shared chart tokens are exported with chart components. */
/**
 * Chart components. Built on recharts (already a dependency) and plain SVG.
 * Colors come from CSS tokens (--chart-1 … --chart-5) so charts theme automatically.
 */
import { useId } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

import { cn } from "../../lib/utils";
import { formatCurrency, formatNumber } from "../lib/format";
import type { CategoryValue, TrendPoint } from "../types";

export const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  /** "area" fills, "line" draws a dashed comparison line */
  kind?: "area" | "line";
}

type ValueKind = "currency" | "number";

function fmt(v: number, kind: ValueKind, compact = false) {
  return kind === "currency" ? formatCurrency(v, { compact }) : formatNumber(v, { compact });
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  valueKind,
}: TooltipProps<number, string> & { series: SeriesDef[]; valueKind: ValueKind }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-xl border border-border bg-popover px-3 py-2.5 text-xs shadow-pop">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((p) => {
          const s = series.find((x) => x.key === p.dataKey);
          return (
            <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: s?.color }} />
                {s?.label}
              </span>
              <span className="num font-medium text-foreground">{fmt(Number(p.value), valueKind)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegend({ series, className }: { series: SeriesDef[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-4 text-xs text-muted-foreground", className)}>
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("inline-block", s.kind === "line" ? "h-0.5 w-3.5 rounded" : "size-2.5 rounded-sm")}
            style={{ background: s.color }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export function TrendChart({
  data,
  series,
  height = 260,
  valueKind = "currency",
  ariaLabel,
}: {
  data: TrendPoint[];
  series: SeriesDef[];
  height?: number;
  valueKind?: ValueKind;
  ariaLabel: string;
}) {
  const gid = useId().replace(/:/g, "");
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: number) => fmt(v, valueKind, true)}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
            content={<ChartTooltip series={series} valueKind={valueKind} />}
          />
          {series.map((s) =>
            s.kind === "line" ? (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            ) : (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2.25}
                fill={`url(#${gid}-${s.key})`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedBarChart({
  data,
  series,
  height = 240,
  ariaLabel,
}: {
  data: TrendPoint[];
  series: SeriesDef[];
  height?: number;
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} dy={6} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: number) => formatCurrency(v, { compact: true })}
          />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltip series={series} valueKind="currency" />} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="a"
              fill={s.color}
              radius={i === series.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  size = 180,
}: {
  data: CategoryValue[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${centerLabel}: ${centerValue}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="70%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={chartColors[i % chartColors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="num text-lg font-semibold text-foreground">{centerValue}</span>
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}

/** Lightweight inline SVG sparkline — no chart library needed. */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  color = "var(--chart-1)",
  fill = true,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  className?: string;
}) {
  const gid = useId().replace(/:/g, "");
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - 2 - ((v - min) / range) * (height - 4),
  ]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2.25} fill={color} />
    </svg>
  );
}

/** Ranked horizontal bars — clearer than a pie for category comparisons. */
export function BarList({
  items,
  valueFormat = (v) => formatCurrency(v),
  color = "bg-primary",
}: {
  items: CategoryValue[];
  valueFormat?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item, idx) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-foreground">
              <span className="num w-4 text-xs text-muted-foreground">{idx + 1}</span>
              <span className="truncate">{item.label}</span>
            </span>
            <span className="num shrink-0 text-sm font-medium text-foreground">{valueFormat(item.value)}</span>
          </div>
          <div className="ml-6 h-1.5 rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", color)}
              style={{ width: `${(item.value / max) * 100}%`, opacity: 1 - idx * 0.14 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
