import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

/** The base card surface with subtle border, shadow, and rounded corners. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-surface shadow-xs transition-all duration-200 hover:border-border-strong/70 hover:shadow-sm", className)}
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
    <header className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-0.5 text-xs font-medium text-muted-foreground">{eyebrow}</p>}
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function PanelBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function PanelFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-border bg-surface-sunken/30 px-5 py-3.5 sm:px-6 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
