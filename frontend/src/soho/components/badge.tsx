/* eslint-disable react-refresh/only-export-components -- Badge variants are exported with the component for consistent styling. */
import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import type { Tone } from "../types";

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-muted-foreground border-border/80",
  primary: "bg-primary/15 text-primary border-primary/30",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  info: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  accent: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  info: "bg-sky-400",
  accent: "bg-violet-400",
};

export function Badge({
  tone = "neutral",
  dot,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.72rem] font-semibold tracking-wide whitespace-nowrap select-none",
        toneClass[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            dotClass[tone],
            (tone === "success" || tone === "primary") && "animate-pulse",
          )}
        />
      )}
      {children}
    </span>
  );
}

export function toneDot(tone: Tone) {
  return dotClass[tone];
}
