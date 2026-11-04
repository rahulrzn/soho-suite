import { useId } from "react";

import { cn } from "../../lib/utils";
import type { HealthScore } from "../types";

const bandTone: Record<NonNullable<HealthScore["band"]>, string> = {
  Thriving: "text-success",
  Healthy: "text-success",
  Watch: "text-warning-foreground",
  "At risk": "text-destructive",
};

/**
 * Semicircular gauge for the Business Health Score (0–100).
 * The track shows the full red→amber→green scale; the filled arc is the score.
 */
export function HealthGauge({
  score,
  band,
  size = 240,
  className,
}: {
  score: number;
  band?: HealthScore["band"];
  size?: number;
  className?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const stroke = 16;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const angle = Math.PI * (1 - pct);
  const kx = cx + r * Math.cos(angle);
  const ky = cy - r * Math.sin(angle);
  const arc = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size / 2 + 28 }}>
      <svg
        width={size}
        height={size / 2 + stroke}
        viewBox={`0 0 ${size} ${size / 2 + stroke}`}
        role="img"
        aria-label={`Business health score ${score} out of 100${band ? `, ${band}` : ""}`}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--chart-5)" />
            <stop offset="50%" stopColor="var(--warning)" />
            <stop offset="100%" stopColor="var(--success)" />
          </linearGradient>
        </defs>
        <path d={arc} fill="none" stroke="var(--muted)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1)" }}
        />
        {/* tick marks at 25/50/75 */}
        {[0.25, 0.5, 0.75].map((t) => {
          const a = Math.PI * (1 - t);
          const r1 = r - stroke / 2 - 5;
          const r2 = r - stroke / 2 - 10;
          return (
            <line
              key={t}
              x1={cx + r1 * Math.cos(a)}
              y1={cy - r1 * Math.sin(a)}
              x2={cx + r2 * Math.cos(a)}
              y2={cy - r2 * Math.sin(a)}
              stroke="var(--border-strong)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={kx} cy={ky} r={stroke / 2 + 3} fill="var(--surface)" stroke="var(--foreground)" strokeWidth={2.5} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="num text-5xl leading-none font-semibold text-foreground">{score}</span>
        {band ? <span className={cn("mt-1.5 text-sm font-semibold", bandTone[band])}>{band}</span> : <span className="mt-1.5 text-xs text-muted-foreground">out of 100</span>}
      </div>
    </div>
  );
}
