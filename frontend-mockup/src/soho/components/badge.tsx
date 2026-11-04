import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Tone } from "../types";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-destructive-soft text-destructive",
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-accent-foreground",
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  accent: "bg-accent",
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
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", dotClass[tone])} />}
      {children}
    </span>
  );
}

export function toneDot(tone: Tone) {
  return dotClass[tone];
}
