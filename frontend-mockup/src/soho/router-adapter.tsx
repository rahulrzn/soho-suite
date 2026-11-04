/**
 * ROUTER ADAPTER — the only file in src/soho that imports a router.
 *
 * This prototype uses TanStack Router. When porting to the existing Soho Suite
 * app, re-implement these two exports with your router (e.g. react-router's
 * <NavLink> and useLocation) and every screen/shell component keeps working.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** All paths the prototype links to. Rename to match your app's routes. */
export type AppPath =
  | "/"
  | "/analytics"
  | "/datasets"
  | "/datasets/upload"
  | "/expenses"
  | "/inventory"
  | "/reports"
  | "/team"
  | "/activity"
  | "/settings"
  | "/states"
  | "/auth/sign-in"
  | "/auth/sign-up"
  | "/auth/forgot-password"
  | "/auth/verify-email";

export function AppLink({
  to,
  className,
  children,
  onClick,
  "aria-label": ariaLabel,
}: {
  to: AppPath;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  return (
    <Link to={to} className={className} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

export function useCurrentPath(): string {
  return useRouterState({ select: (s) => s.location.pathname });
}
