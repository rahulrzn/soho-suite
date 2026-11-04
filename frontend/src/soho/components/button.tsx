/* eslint-disable react-refresh/only-export-components -- Button variants are exported with the component for consistent styling. */
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90",
        accent: "bg-accent text-accent-foreground shadow-soft hover:bg-accent/90",
        secondary: "border border-border bg-surface text-foreground shadow-soft hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger: "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
        "danger-ghost": "text-destructive hover:bg-destructive-soft",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
        // For use on dark brand surfaces (sidebar, auth panel)
        inverse: "bg-brand-panel-foreground/10 text-brand-panel-foreground hover:bg-brand-panel-foreground/15",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
