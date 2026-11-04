import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { formatDelta } from "../lib/format";

/* ---------- Avatar ---------- */

const avatarTones = [
  "bg-primary-soft text-primary",
  "bg-accent-soft text-accent-foreground",
  "bg-success-soft text-success",
  "bg-info-soft text-info",
  "bg-destructive-soft text-destructive",
];

export function Avatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tone = avatarTones[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % avatarTones.length];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        tone,
        size === "sm" && "size-7 text-[0.65rem]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-14 text-base",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/* ---------- Delta ---------- */

export function Delta({
  value,
  goodWhen = "up",
  className,
  suffix,
}: {
  value: number;
  goodWhen?: "up" | "down";
  className?: string;
  suffix?: string;
}) {
  const isFlat = Math.abs(value) < 0.05;
  const isGood = isFlat ? null : goodWhen === "up" ? value > 0 : value < 0;
  const Icon = isFlat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        isGood === null && "bg-muted text-muted-foreground",
        isGood === true && "bg-success-soft text-success",
        isGood === false && "bg-destructive-soft text-destructive",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {formatDelta(value)}
      {suffix && <span className="sr-only"> {suffix}</span>}
    </span>
  );
}

/* ---------- Meter ---------- */

export function Meter({
  value,
  max = 100,
  tone,
  className,
  label,
  marker,
}: {
  value: number;
  max?: number;
  tone?: "primary" | "success" | "warning" | "danger" | "auto";
  className?: string;
  label?: string;
  /** Optional marker position (same unit as value), e.g. a target or reorder point */
  marker?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const resolved =
    tone === "auto" || !tone
      ? pct >= 85
        ? "success"
        : pct >= 65
          ? "warning"
          : "danger"
      : tone;
  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn("relative h-1.5 w-full overflow-visible rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          resolved === "primary" && "bg-primary",
          resolved === "success" && "bg-success",
          resolved === "warning" && "bg-warning",
          resolved === "danger" && "bg-destructive",
        )}
        style={{ width: `${pct}%` }}
      />
      {marker !== undefined && (
        <span
          aria-hidden
          className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-foreground/60"
          style={{ left: `${Math.min(100, (marker / max) * 100)}%` }}
        />
      )}
    </div>
  );
}

/* ---------- Segmented control ---------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface-sunken p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md font-medium transition-all",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            o.value === value
              ? "bg-surface text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Tabs (underline) ---------- */

export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-5 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={cn(
            "-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm font-medium transition-colors",
            t.value === value
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="num rounded-full bg-muted px-1.5 text-[0.7rem] text-muted-foreground">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------- Page header ---------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold text-foreground md:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Stat strip: several metrics in one surface, divided ---------- */

export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-soft sm:grid-cols-2 lg:grid-cols-4 [&>*]:bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-4 md:p-5">
      {icon && (
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="num mt-1 text-xl font-semibold text-foreground">{value}</p>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}
