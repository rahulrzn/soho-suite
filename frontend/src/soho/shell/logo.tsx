import { cn } from "../../lib/utils";

/** Gradient mark cropped from the supplied Soho Suite artwork. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/soho-brand-mark.png"
      className={cn("size-8 object-contain", className)}
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  );
}

/** Responsive wordmark: keep the supplied mark and render its letters cleanly as text. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("brand-wordmark", className)} role="img" aria-label="Soho Suite">
      <LogoMark className="brand-wordmark-mark" />
      <span className="brand-wordmark-text" aria-hidden="true"><span>Soho</span> <span className="brand-wordmark-suite">Suite</span></span>
    </span>
  );
}

export function Logo({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {collapsed ? <LogoMark /> : <BrandWordmark className="brand-wordmark-sidebar" />}
    </span>
  );
}
