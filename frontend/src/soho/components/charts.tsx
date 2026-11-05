/* eslint-disable react-refresh/only-export-components -- Shared chart tokens are exported with chart components. */
/**
 * Chart components built on Recharts and SVG.
 * Colors utilize semantic CSS tokens so charts adapt automatically to light and dark themes.
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
  /** "area" fills beneath the curve; "line" draws a dashed comparison line */
  kind?: "area" | "line";
}

type ValueKind = "currency" | "number";

function fmt(v: number, kind: ValueKind, compact = false, currency?: string | null) {
  return kind === "currency" ? formatCurrency(v, { compact, currency: currency ?? undefined }) : formatNumber(v, { compact });
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  valueKind,
  currency,
}: TooltipProps<number, string> & { series: SeriesDef[]; valueKind: ValueKind; currency?: string | null }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-44 rounded-xl border border-border bg-popover/95 p-3 text-xs shadow-pop backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150">
      <p className="mb-2 font-semibold text-foreground border-b border-border/60 pb-1.5">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p) => {
          const s = series.find((x) => x.key === p.dataKey);
          return (
            <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground font-medium">
                <span className="size-2.5 rounded-sm" style={{ background: s?.color }} />
                {s?.label}
              </span>
              <span className="num font-semibold text-foreground">
                {fmt(Number(p.value), valueKind, false, currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegend({
  series,
  activeKeys,
  onToggle,
  className,
}: {
  series: SeriesDef[];
  activeKeys?: string[];
  onToggle?: (key: string) => void;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-2 text-xs text-muted-foreground select-none", className)}>
      {series.map((s) => {
        const isEnabled = !activeKeys || activeKeys.includes(s.key);
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={onToggle ? () => onToggle(s.key) : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 font-medium transition-all rounded-md px-2 py-0.5 border border-transparent",
                onToggle && "hover:border-border hover:bg-surface-sunken cursor-pointer active:scale-95",
                !isEnabled && "opacity-40 border-dashed border-border bg-surface-sunken/40 text-muted-foreground",
                isEnabled && "text-foreground/90",
              )}
              title={onToggle ? `Click to toggle ${s.label} visibility` : undefined}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block shrink-0 transition-opacity",
                  s.kind === "line" ? "h-1 w-3.5 rounded" : "size-2 rounded-xs",
                )}
                style={{ background: isEnabled ? s.color : "var(--color-muted-foreground)" }}
              />
              <span>{s.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function TrendChart({
  data,
  series,
  visibleKeys,
  height = 280,
  valueKind = "currency",
  ariaLabel,
  currency,
}: {
  data: TrendPoint[];
  series: SeriesDef[];
  visibleKeys?: string[];
  height?: number;
  valueKind?: ValueKind;
  ariaLabel: string;
  currency?: string | null;
}) {
  const gid = useId().replace(/:/g, "");
  const activeSeries = series.filter((s) => !visibleKeys || visibleKeys.includes(s.key));
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 6, bottom: 4, left: -4 }}>
          <defs>
            {activeSeries.map((s) => (
              <linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-sans)" }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v: number) => fmt(v, valueKind, true, currency)}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border-strong)", strokeDasharray: "4 4", strokeWidth: 1 }}
            content={<ChartTooltip series={activeSeries} valueKind={valueKind} currency={currency} />}
          />
          {activeSeries.map((s) =>
            s.kind === "line" ? (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-surface)" }}
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
                activeDot={{ r: 4.5, strokeWidth: 2.5, stroke: "var(--color-surface)" }}
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
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted)", fontSize: 11 }} dy={6} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v: number) => formatCurrency(v, { compact: true })}
          />
          <Tooltip cursor={{ fill: "var(--color-surface-sunken)", opacity: 0.6 }} content={<ChartTooltip series={series} valueKind="currency" />} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="a"
              fill={s.color}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
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
    <div className="relative shrink-0 select-none" style={{ width: size, height: size }} role="img" aria-label={`${centerLabel}: ${centerValue}`}>
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
        <span className="num text-xl font-bold tracking-tight text-foreground">{centerValue}</span>
        <span className="text-xs font-medium text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}

/** Lightweight inline SVG sparkline with subtle area gradient */
export function Sparkline({
  values,
  width = 84,
  height = 30,
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
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2.5} fill={color} />
    </svg>
  );
}

/** Ranked horizontal bars for categories */
export function BarList({
  items,
  valueFormat = (v) => formatCurrency(v),
  color = "bg-primary",
}: {
  items: CategoryValue[];
  valueFormat?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item, idx) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-foreground font-medium">
              <span className="num w-4 text-xs font-semibold text-muted-foreground">{idx + 1}</span>
              <span className="truncate">{item.label}</span>
            </span>
            <span className="num shrink-0 text-sm font-semibold text-foreground">{valueFormat(item.value)}</span>
          </div>
          <div className="ml-6 h-2 rounded-full bg-surface-sunken overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", color)}
              style={{ width: `${Math.min(100, Math.max(4, (item.value / max) * 100))}%`, opacity: Math.max(0.4, 1 - idx * 0.12) }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
