import type { ValueFormat } from "../types";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const currencyCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const currencyCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat("en-US");
const numberCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatCurrency(value: number, opts: { compact?: boolean; cents?: boolean } = {}) {
  if (opts.compact) return currencyCompact.format(value);
  if (opts.cents) return currencyCents.format(value);
  return currency.format(value);
}

export function formatNumber(value: number, opts: { compact?: boolean } = {}) {
  return opts.compact ? numberCompact.format(value) : number.format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function formatValue(value: number, format: ValueFormat, opts: { compact?: boolean } = {}) {
  switch (format) {
    case "currency":
      return value < 1000 && !Number.isInteger(value)
        ? formatCurrency(value, { cents: true })
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
