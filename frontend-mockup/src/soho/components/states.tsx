import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {icon && (
        <div className="relative mb-4">
          <div aria-hidden className="absolute -inset-3 rounded-full bg-primary-soft/60" />
          <div className="relative inline-flex size-12 items-center justify-center rounded-2xl border border-border bg-surface text-primary shadow-lift [&_svg]:size-5">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

const alertStyles = {
  info: { icon: Info, cls: "border-info/25 bg-info-soft text-info" },
  success: { icon: CheckCircle2, cls: "border-success/25 bg-success-soft text-success" },
  warning: { icon: AlertTriangle, cls: "border-warning/40 bg-warning-soft text-warning-foreground" },
  danger: { icon: XCircle, cls: "border-destructive/25 bg-destructive-soft text-destructive" },
};

export function InlineAlert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof alertStyles;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, cls } = alertStyles[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border px-4 py-3", cls, className)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-0.5 text-foreground/75">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton h-4", className)} />;
}

/** Right-side sheet for forms & detail views. Escape and overlay click close it. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px] animate-in fade-in" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-pop animate-in slide-in-from-right duration-300"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
