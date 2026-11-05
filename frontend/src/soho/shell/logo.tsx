import { cn } from "../../lib/utils";

/** Logo mark loaded from the Soho Suite brand asset. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/soho-brand-mark.png"
      className={cn("size-8 shrink-0 object-contain", className)}
      alt="Soho Suite mark"
      aria-hidden="true"
      draggable="false"
    />
  );
}

/** Responsive brand wordmark pairing the mark with balanced typography. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("brand-wordmark inline-flex items-center gap-2.5 select-none", className)} role="img" aria-label="Soho Suite">
      <LogoMark className="size-8" />
      <span className="brand-wordmark-text inline-flex items-baseline font-bold tracking-tight text-base sm:text-[1.125rem]" aria-hidden="true">
        <span className="text-foreground">Soho</span>
        <span className="ml-1 font-semibold text-accent dark:text-primary">Suite</span>
      </span>
    </span>
  );
}

export function Logo({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {collapsed ? <LogoMark className="size-8" /> : <BrandWordmark />}
    </span>
  );
}
