import {
  Bell,
  ChevronsUpDown,
  CircleHelp,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Avatar } from "../components/misc";
import { Button } from "../components/button";
import { AppLink, useCurrentPath } from "../router-adapter";
import type { CurrentUser } from "../types";
import { Logo } from "./logo";
import { isActivePath, navGroups } from "./nav-config";

export interface AppShellProps {
  children: ReactNode;
  user: CurrentUser;
  businessName: string;
  businessPlan?: string;
  /** Hook up to Firebase signOut() in the real app */
  onSignOut?: () => void;
  notificationCount?: number;
}

export function AppShell({ children, user, businessName, businessPlan, onSignOut, notificationCount = 0 }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const path = useCurrentPath();

  useEffect(() => setMobileOpen(false), [path]);

  const sidebar = (isMobile: boolean) => {
    const isCollapsed = collapsed && !isMobile;
    return (
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
        <div className={cn("flex h-16 items-center gap-2 px-4", isCollapsed && "justify-center px-0")}>
          <AppLink to="/" aria-label="Soho Suite home" className="rounded-lg">
            <Logo collapsed={isCollapsed} />
          </AppLink>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="ml-auto rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Business switcher (visual only) */}
        <div className={cn("px-3 pb-3", isCollapsed && "px-2")}>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-2 text-left transition-colors hover:bg-sidebar-accent",
              isCollapsed && "justify-center",
            )}
            aria-label={`Current business: ${businessName}. Switch business`}
          >
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/15 font-display text-sm font-semibold text-sidebar-primary">
              {businessName.charAt(0)}
            </span>
            {!isCollapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{businessName}</span>
                  {businessPlan && <span className="block text-xs text-sidebar-muted">{businessPlan} plan</span>}
                </span>
                <ChevronsUpDown className="size-4 text-sidebar-muted" />
              </>
            )}
          </button>
        </div>

        <nav aria-label="Main" className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mt-4 first:mt-1">
              {!isCollapsed ? (
                <p className="mb-1.5 px-2.5 text-[0.65rem] font-semibold tracking-[0.1em] text-sidebar-muted/80 uppercase">
                  {group.label}
                </p>
              ) : (
                <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActivePath(path, item.to);
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <AppLink
                        to={item.to}
                        aria-label={isCollapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                          isCollapsed && "justify-center px-0",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        )}
                      >
                        {active && (
                          <span aria-hidden className="absolute top-1.5 bottom-1.5 left-0 w-0.75 rounded-full bg-sidebar-primary" />
                        )}
                        <Icon className={cn("size-4.5 shrink-0", active && "text-sidebar-primary")} />
                        {!isCollapsed && <span className="flex-1">{item.label}</span>}
                        {!isCollapsed && item.badge && (
                          <span className="num rounded-full bg-sidebar-primary/15 px-1.5 text-[0.7rem] text-sidebar-primary">
                            {item.badge}
                          </span>
                        )}
                      </AppLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-sidebar-border p-3", isCollapsed && "px-2")}>
          <div className={cn("flex items-center gap-2.5 rounded-lg p-1.5", isCollapsed && "justify-center")}>
            <Avatar initials={user.initials} size="sm" />
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-sidebar-muted">{user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <LogOut className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block",
          collapsed ? "w-18" : "w-64",
        )}
      >
        {sidebar(false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40 animate-in fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-pop animate-in slide-in-from-left duration-200">
            {sidebar(true)}
          </aside>
        </div>
      )}

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-18" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>

          <button
            type="button"
            className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted-foreground shadow-soft transition-colors hover:border-border-strong"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate text-left">Search reports, SKUs, expenses…</span>
            <kbd className="num hidden rounded border border-border bg-surface-sunken px-1.5 py-0.5 text-[0.65rem] sm:inline">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Help" className="hidden sm:inline-flex">
              <CircleHelp />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Notifications (${notificationCount} unread)`} className="relative">
              <Bell />
              {notificationCount > 0 && (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-accent ring-2 ring-background" />
              )}
            </Button>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
