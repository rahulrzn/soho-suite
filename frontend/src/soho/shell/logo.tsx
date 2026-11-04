import { cn } from "../../lib/utils";

/** Soho Suite mark: three rising blocks — growth, built on solid ground. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <rect x="7" y="17" width="5" height="8" rx="1.5" fill="var(--accent-foreground)" opacity="0.55" />
      <rect x="13.5" y="12" width="5" height="13" rx="1.5" fill="var(--accent-foreground)" opacity="0.8" />
      <rect x="20" y="7" width="5" height="18" rx="1.5" fill="var(--accent-foreground)" />
    </svg>
  );
}

export function Logo({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!collapsed && (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight">
          Soho<span className="opacity-60"> Suite</span>
        </span>
      )}
    </span>
  );
}
