import { ArrowDownRight, ArrowUpRight, Check, Copy, Minus } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "../../lib/utils";
import { formatDelta } from "../lib/format";

/* ---------- Avatar ---------- */

const avatarTones = [
  "bg-primary/20 text-primary border border-primary/30",
  "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  "bg-violet-500/15 text-violet-400 border border-violet-500/25",
  "bg-sky-500/15 text-sky-400 border border-sky-500/25",
  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  "bg-teal-500/15 text-teal-400 border border-teal-500/25",
  "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25",
  "bg-amber-500/15 text-amber-400 border border-amber-500/25",
];

function getAvatarTone(initials: string): string {
  if (!initials) return avatarTones[0];
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = (hash << 5) - hash + initials.charCodeAt(i);
    hash |= 0;
  }
  return avatarTones[Math.abs(hash) % avatarTones.length];
}

export function Avatar({
  initials,
  size = "md",
  className,
  tone,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  tone?: "brand" | "auto" | string;
}) {
  const resolvedTone =
    tone === "brand"
      ? "bg-primary/20 text-primary border border-primary/30"
      : tone && tone !== "auto"
      ? tone
      : getAvatarTone(initials);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold select-none",
        resolvedTone,
        size === "sm" && "size-7 text-[0.68rem]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-12 text-sm",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/* ---------- Delta Indicator ---------- */

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
        "num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold select-none",
        isGood === null && "bg-surface-sunken text-muted-foreground",
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

/* ---------- Progress Meter ---------- */

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
      ? pct >= 80
        ? "success"
        : pct >= 50
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
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-sunken", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
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
          className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/60 shadow-xs"
          style={{ left: `${Math.min(100, (marker / max) * 100)}%` }}
        />
      )}
    </div>
  );
}

/* ---------- Segmented Control ---------- */

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
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface-sunken p-1 shadow-xs select-none">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md font-medium transition-all duration-150",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm",
            o.value === value
              ? "bg-surface text-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Underline Tabs ---------- */

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
    <div role="tablist" aria-label={label} className="flex gap-6 border-b border-border select-none">
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
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="num rounded-full bg-surface-sunken px-2 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------- Page Header ---------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  size = "default",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  size?: "default" | "compact";
}) {
  return (
    <div className={cn("flex flex-col gap-4 border-b border-border/80 pb-5 md:flex-row md:items-end md:justify-between", size === "compact" && "gap-3 pb-4")}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-medium text-muted-foreground">{eyebrow}</div>}
        <h1 className={cn("font-bold tracking-tight text-foreground", size === "compact" ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl")}>
          {title}
        </h1>
        {description && <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2.5 md:w-auto shrink-0">{actions}</div>}
    </div>
  );
}

/* ---------- Stat Strip & Stat Item ---------- */

export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface shadow-xs",
        className,
      )}
    >
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

const statToneMap = {
  primary: "bg-primary/15 text-primary border border-primary/25",
  info: "bg-sky-500/15 text-sky-400 border border-sky-500/25",
  success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  warning: "bg-amber-500/15 text-amber-300 border border-amber-500/25",
  danger: "bg-rose-500/15 text-rose-400 border border-rose-500/25",
  purple: "bg-violet-500/15 text-violet-400 border border-violet-500/25",
};

export function Stat({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "primary" | "info" | "success" | "warning" | "danger" | "purple";
}) {
  const toneCls = tone ? statToneMap[tone] : "bg-surface-sunken text-muted-foreground border border-border";
  const valStr = typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

  return (
    <div className="flex items-start gap-3 p-4 sm:p-5 min-w-0 overflow-hidden">
      {icon && (
        <span className={cn("mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg shadow-2xs [&_svg]:size-4.5", toneCls)}>
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
        <p
          className={cn(
            "num mt-1 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl",
          )}
          title={valStr || undefined}
        >
          {value}
        </p>
        {hint && <div className="mt-1 text-xs text-muted-foreground truncate">{hint}</div>}
      </div>
    </div>
  );
}

/* ---------- Interactive Copyable Value ---------- */

export function Copyable({
  text,
  children,
  className,
}: {
  text: string;
  children?: ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API restricted
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy to clipboard"
      className={cn(
        "group relative inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-mono transition-colors hover:bg-surface-sunken hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
    >
      <span className="truncate">{children ?? text}</span>
      {copied ? (
        <span className="inline-flex items-center gap-1 text-[0.68rem] font-sans font-semibold text-success animate-in fade-in duration-150">
          <Check className="size-3 text-success" />
          <span>Copied</span>
        </span>
      ) : (
        <Copy className="size-3 text-muted-foreground/60 transition-opacity group-hover:text-foreground group-hover:opacity-100 opacity-0 sm:opacity-40" />
      )}
    </button>
  );
}

/* ---------- Shimmer Skeleton Loader ---------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-sunken before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent",
        className,
      )}
    />
  );
}
