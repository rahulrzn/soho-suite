/* eslint-disable react-hooks/set-state-in-effect -- Route changes close the mobile navigation drawer. */
import {
  Building2,
  ChevronDown,
  ChevronsUpDown,
  Check,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cn } from "../../lib/utils";
import { Avatar } from "../components/misc";
import { Button } from "../components/button";
import { ThemeToggle } from "../components/theme-toggle";
import { AppLink, useCurrentPath } from "../router-adapter";
import type { CurrentUser } from "../types";
import { Logo } from "./logo";
import { isActivePath, navGroups } from "./nav-config";

export interface AppShellProps {
  children: ReactNode;
  user: CurrentUser;
  businessName: string;
  businesses?: { id: number; name: string }[];
  businessId?: number;
  onSelectBusiness?: (id: number) => void;
  /** Hook up to Firebase signOut() in the real app */
  onSignOut?: () => void;
  notificationCount?: number;
}

export function AppShell({ children, user, businessName, businesses = [], businessId, onSelectBusiness, onSignOut }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const profileMenuId = useId();
  const path = useCurrentPath();
  const currentPage = navGroups.flatMap((group) => group.items).find((item) => isActivePath(path, item.to));
  const currentGroup = navGroups.find((group) => group.items.some((item) => isActivePath(path, item.to)));
  const CurrentPageIcon = currentPage?.icon;

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [path]);

  useEffect(() => {
    if (!profileOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileTriggerRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  const sidebar = (isMobile: boolean) => {
    const isCollapsed = collapsed && !isMobile;
    return (
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
        <div className={cn("flex h-[4.5rem] items-center gap-2 border-b border-sidebar-border/70 px-5", isCollapsed && "justify-center px-0")}>
          <AppLink to="/" aria-label="Soho Suite home" className="rounded-lg">
            <Logo collapsed={isCollapsed} />
          </AppLink>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="ml-auto inline-flex size-10 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <BusinessSwitcher
            businesses={businesses}
            businessId={businessId}
            businessName={businessName}
            onSelectBusiness={onSelectBusiness}
          />
        )}

        <nav aria-label="Main" className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mt-5 first:mt-2">
              {!isCollapsed ? (
                <p className="mb-1.5 px-2.5 text-xs font-medium text-sidebar-muted">
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
                        aria-current={active ? "page" : undefined}
                        aria-label={isCollapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex min-h-10 items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                          isCollapsed && "justify-center px-0",
                          active
                            ? "bg-sidebar-accent/90 text-sidebar-accent-foreground"
                            : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        )}
                      >
                        {active && (
                          <span aria-hidden className="absolute top-1.5 bottom-1.5 left-0 w-0.75 rounded-full bg-sidebar-primary" />
                        )}
                        <Icon className={cn("size-4.5 shrink-0", active && "text-sidebar-primary")} />
                        {!isCollapsed && <span className="flex-1">{item.label}</span>}
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
    <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-background">
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
          collapsed ? "w-18" : "w-68",
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

      <div className={cn("min-w-0 transition-[padding] duration-200", collapsed ? "lg:pl-18" : "lg:pl-68")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 md:px-7">
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
          <div aria-label="Current page" className="flex min-w-0 items-center gap-2.5">
            {CurrentPageIcon && <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><CurrentPageIcon aria-hidden className="size-4" /></span>}
            <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:inline">{currentGroup?.label ?? "Workspace"}</span>
            <span aria-hidden="true" className="hidden h-5 w-px bg-border-strong sm:block" />
            <span className="truncate text-sm font-semibold text-foreground">{currentPage?.label ?? "Workspace"}</span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <ThemeToggle />
            <div ref={profileMenuRef} className="relative">
              <button
                ref={profileTriggerRef}
                type="button"
                aria-label={`Account options for ${user.name}`}
                aria-expanded={profileOpen}
                aria-controls={profileMenuId}
                onClick={() => setProfileOpen((open) => !open)}
                className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2 text-left transition-colors hover:border-border hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Avatar initials={user.initials} size="md" />
                <span className="hidden max-w-36 truncate text-sm font-medium text-foreground sm:inline">{user.name}</span>
                <ChevronDown aria-hidden="true" className={cn("hidden size-4 text-muted-foreground transition-transform sm:block", profileOpen && "rotate-180")} />
              </button>
              {profileOpen && <div id={profileMenuId} aria-label="Account options" className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-pop">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <Avatar initials={user.initials} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-y border-border bg-surface-sunken/60 px-4 py-2 text-xs">
                  <span className="text-muted-foreground">Current workspace</span>
                  <span className="max-w-28 truncate font-medium text-foreground">{businessName}</span>
                </div>
                <nav aria-label="Account settings" className="grid gap-1 p-1.5">
                  <AppLink to="/settings/profile" onClick={() => setProfileOpen(false)} className="flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground transition-colors hover:bg-surface-sunken">
                    <Settings aria-hidden="true" className="size-4 text-muted-foreground" /> Profile settings
                  </AppLink>
                  <AppLink to="/settings/business" onClick={() => setProfileOpen(false)} className="flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground transition-colors hover:bg-surface-sunken">
                    <Building2 aria-hidden="true" className="size-4 text-muted-foreground" /> Business settings
                  </AppLink>
                  <button type="button" onClick={() => { setProfileOpen(false); onSignOut?.(); }} className="flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive-soft">
                    <LogOut aria-hidden="true" className="size-4" /> Sign out
                  </button>
                </nav>
              </div>}
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full min-w-0 max-w-[1480px] px-4 py-6 sm:px-6 md:py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function BusinessSwitcher({
  businesses = [],
  businessId,
  businessName,
  onSelectBusiness,
}: Pick<AppShellProps, "businesses" | "businessId" | "businessName" | "onSelectBusiness">) {
  const [open, setOpen] = useState(false);
  const optionsId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const canSwitch = businesses.length > 1 && Boolean(onSelectBusiness);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative px-4 pb-2 pt-4">
      <p className="mb-2 px-1 text-[0.72rem] font-medium text-sidebar-muted">Your business</p>
      <button
        ref={triggerRef}
        type="button"
        aria-label={canSwitch ? `Switch business. Current business: ${businessName}` : `Current business: ${businessName}`}
        aria-expanded={canSwitch ? open : undefined}
        aria-controls={canSwitch ? optionsId : undefined}
        aria-disabled={canSwitch ? undefined : true}
        onClick={() => canSwitch && setOpen((value) => !value)}
        className={cn(
          "flex min-h-12 w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/45 p-2.5 text-left transition-colors",
          canSwitch && "hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring",
          !canSwitch && "cursor-default",
        )}
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/15 font-display text-sm font-semibold text-sidebar-primary">
          {businessName.charAt(0)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-foreground">{businessName}</span>
        {canSwitch && <ChevronsUpDown className="size-4 shrink-0 text-sidebar-muted" aria-hidden="true" />}
      </button>

      {open && canSwitch && (
        <div
          id={optionsId}
          aria-label="Businesses"
          className="absolute inset-x-4 top-full z-50 mt-2 overflow-hidden rounded-lg border border-sidebar-border bg-popover p-1.5 text-popover-foreground shadow-pop"
        >
          <p className="px-2.5 py-1.5 text-[0.68rem] font-medium text-muted-foreground">Switch business</p>
          <div role="group" aria-label="Available businesses" className="max-h-64 overflow-y-auto">
            {businesses.map((business) => {
              const selected = business.id === businessId;
              return (
                <button
                  type="button"
                  key={business.id}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => {
                    onSelectBusiness?.(business.id);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-popover-foreground transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:outline-none",
                    selected && "bg-sidebar-accent/70 font-medium",
                  )}
                >
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">
                    {business.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{business.name}</span>
                  {selected && <Check className="size-4 shrink-0 text-sidebar-primary" aria-label="Current business" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
