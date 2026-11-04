import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

/** The base surface. Prefer one Panel with internal dividers over many small cards. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-surface shadow-soft", className)}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PanelBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

export function PanelFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
