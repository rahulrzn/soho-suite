/* eslint-disable react-refresh/only-export-components -- Button variants are exported with the component for consistent styling. */
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-150 select-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:opacity-95 shadow-xs border border-primary/20",
        accent: "bg-accent text-accent-foreground hover:opacity-95 shadow-xs border border-accent/20",
        secondary: "border border-border-strong bg-surface text-foreground hover:bg-surface-sunken hover:border-border shadow-xs",
        ghost: "text-muted-foreground hover:bg-surface-sunken hover:text-foreground",
        danger: "bg-destructive text-destructive-foreground hover:opacity-95 shadow-xs",
        "danger-ghost": "text-destructive hover:bg-destructive-soft",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
        // For use on dark brand surfaces
        inverse: "bg-brand-panel-foreground/10 text-brand-panel-foreground hover:bg-brand-panel-foreground/15",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9.5 px-3.5 text-xs sm:text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "size-9.5",
        "icon-sm": "size-8.5",
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
