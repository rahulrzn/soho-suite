import { useId } from "react";

import { cn } from "../../lib/utils";
import type { HealthScore } from "../types";

const bandTone: Record<string, string> = {
  Thriving: "text-success bg-success-soft border-success/30",
  Healthy: "text-success bg-success-soft border-success/30",
  Watch: "text-warning-foreground bg-warning-soft border-warning/30",
  "At risk": "text-destructive bg-destructive-soft border-destructive/30",
  Pending: "text-muted-foreground bg-surface-sunken border-border/80",
};

/**
 * Semicircular gauge for the Business Health Score (0–100).
 * Displays full scale track with active score arc and indicator pin.
 */
export function HealthGauge({
  score,
  band,
  size = 220,
  className,
}: {
  score: number | null;
  band?: HealthScore["band"] | "Pending";
  size?: number;
  className?: string;
}) {
  const isAvailable = score !== null;
  const numScore = isAvailable ? score : 0;
  const gid = useId().replace(/:/g, "");
  const stroke = 14;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * r;
  const pct = Math.max(0, Math.min(100, numScore)) / 100;
  const angle = Math.PI * (1 - pct);
  const kx = cx + r * Math.cos(angle);
  const ky = cy - r * Math.sin(angle);
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div
      className={cn("relative flex flex-col items-center select-none pb-2", className)}
      style={{ width: size, minHeight: size / 2 + 56 }}
    >
      <svg
        width={size}
        height={size / 2 + stroke + 6}
        viewBox={`0 0 ${size} ${size / 2 + stroke + 6}`}
        role="img"
        aria-label={`Business health score ${isAvailable ? score : "pending"} out of 100${band ? `, status: ${band}` : ""}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--chart-5)" />
            <stop offset="45%" stopColor="var(--warning)" />
            <stop offset="85%" stopColor="var(--success)" />
          </linearGradient>
          <filter id={`${gid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Base Track */}
        <path
          d={arc}
          fill="none"
          stroke="var(--color-surface-sunken)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={isAvailable ? undefined : "6 6"}
        />

        {/* Filled Score Arc (Only if score is available) */}
        {isAvailable && (
          <path
            d={arc}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        )}

        {/* Subtle Tick Marks at 25%, 50%, 75% */}
        {[0.25, 0.5, 0.75].map((t) => {
          const a = Math.PI * (1 - t);
          const r1 = r - stroke / 2 - 3;
          const r2 = r - stroke / 2 - 7;
          return (
            <line
              key={t}
              x1={cx + r1 * Math.cos(a)}
              y1={cy - r1 * Math.sin(a)}
              x2={cx + r2 * Math.cos(a)}
              y2={cy - r2 * Math.sin(a)}
              stroke="var(--color-line-strong)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Current Score Indicator Pin */}
        {isAvailable && (
          <circle
            cx={kx}
            cy={ky}
            r={stroke / 2 + 1.5}
            fill="var(--color-surface)"
            stroke="var(--color-foreground)"
            strokeWidth={2.5}
            filter={`url(#${gid}-shadow)`}
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>

      {/* Score Number and Status Band in Center */}
      <div className="mt-1 flex flex-col items-center">
        <span className="num text-4xl sm:text-5xl font-bold leading-none tracking-tight text-foreground">
          {isAvailable ? score : "—"}
        </span>
        <span
          className={cn(
            "mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
            bandTone[band ?? (isAvailable ? "Healthy" : "Pending")] ?? bandTone.Pending,
          )}
        >
          {band ?? (isAvailable ? "Healthy" : "Pending assessment")}
        </span>
      </div>
    </div>
  );
}
