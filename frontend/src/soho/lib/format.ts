import type { ValueFormat } from "../types";

const number = new Intl.NumberFormat("en-US");
const numberCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatCurrency(value: number, opts: { compact?: boolean; cents?: boolean; currency?: string } = {}) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: opts.currency ?? "USD",
    ...(opts.compact ? { notation: "compact" as const, maximumFractionDigits: 1 } : {}),
    ...(opts.cents ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : opts.compact ? {} : { maximumFractionDigits: 0 }),
  });
  return formatter.format(value);
}

export function formatNumber(value: number, opts: { compact?: boolean } = {}) {
  return opts.compact ? numberCompact.format(value) : number.format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function formatValue(value: number, format: ValueFormat, opts: { compact?: boolean; currency?: string } = {}) {
  switch (format) {
    case "currency":
      return value < 1000 && !Number.isInteger(value)
        ? formatCurrency(value, { cents: true, currency: opts.currency })
        : formatCurrency(value, opts);
    case "percent":
      return formatPercent(value);
    case "days":
      return `${formatNumber(value)} days`;
    default:
      return Number.isInteger(value) ? formatNumber(value, opts) : value.toFixed(1);
  }
}

export function formatDelta(delta: number) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${Math.abs(delta).toFixed(1)}%`;
}
