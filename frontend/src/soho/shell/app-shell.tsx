/* eslint-disable react-hooks/set-state-in-effect -- Route changes close the mobile navigation drawer. */
import {
  Boxes,
  Building2,
  ChevronDown,
  ChevronsUpDown,
  Check,
  Database,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { formatApiError } from "../../api/formatError";
import { cn } from "../../lib/utils";
import { navigate } from "../../app/navigation";
import { Avatar } from "../components/misc";
import { Button } from "../components/button";
import { ConfirmDialog, Modal } from "../../components/Modal";
import { ThemeToggle } from "../components/theme-toggle";
import { toggleTheme } from "../theme";
import { AppLink, useCurrentPath } from "../router-adapter";
import type { CurrentUser } from "../types";
import { Logo } from "./logo";
import { isActivePath, navGroups } from "./nav-config";
import { CommandMenu } from "./command-menu";
import { ShortcutsModal } from "./shortcuts-modal";

export interface AppShellProps {
  children: ReactNode;
  user: CurrentUser;
  businessName: string;
  businesses?: { id: number; name: string }[];
  businessId?: number;
  onSelectBusiness?: (id: number) => void;
  onCreateWorkspace?: (name: string) => Promise<void>;
  /** Hook up to Firebase signOut() in the real app */
  onSignOut?: () => void;
  notificationCount?: number;
}

export function AppShell({
  children,
  user,
  businessName,
  businesses = [],
  businessId,
  onSelectBusiness,
  onCreateWorkspace,
  onSignOut,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [chordPending, setChordPending] = useState<string | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const profileMenuId = useId();
  const path = useCurrentPath();
  const currentPage = navGroups.flatMap((group) => group.items).find((item) => isActivePath(path, item.to));

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent);

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isInput =
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select" ||
        target?.isContentEditable ||
        document.activeElement?.getAttribute("contenteditable") === "true";

      // Escape key clears any pending sequence and closes open menus
      if (e.key === "Escape") {
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        setChordPending(null);
        setCommandMenuOpen(false);
        setShortcutsOpen(false);
        setProfileOpen(false);
        return;
      }

      // Cmd+K or Ctrl+K opens Command Menu
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandMenuOpen((prev) => !prev);
        return;
      }

      // Single-letter shortcuts should NOT fire while typing in an input
      if (isInput) return;

      // "/" opens search/command menu
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !commandMenuOpen && !shortcutsOpen) {
        e.preventDefault();
        setCommandMenuOpen(true);
        return;
      }

      // "?" opens keyboard shortcuts cheat-sheet
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // "T" or "t" toggles Light / Dark Theme
      if ((e.key === "t" || e.key === "T") && !e.metaKey && !e.ctrlKey && !e.altKey && !chordPending && !commandMenuOpen && !shortcutsOpen) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // If "G" chord is pending, listen for the navigation destination:
      if (chordPending === "g") {
        e.preventDefault();
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        setChordPending(null);

        const key = e.key.toLowerCase();
        switch (key) {
          case "d":
          case "o":
          case "h":
            navigate("/overview");
            break;
          case "a":
            navigate("/analytics");
            break;
          case "s":
            navigate("/datasets");
            break;
          case "e":
            navigate("/expenses");
            break;
          case "i":
            navigate("/inventory");
            break;
          case "r":
            navigate("/reports");
            break;
          case "t":
            navigate("/team");
            break;
          case "l":
            navigate("/activity");
            break;
          case "b":
            navigate("/settings/business");
            break;
          case "p":
            navigate("/settings/profile");
            break;
          default:
            break;
        }
        return;
      }

      // Start "G" chord sequence
      if ((e.key === "g" || e.key === "G") && !e.metaKey && !e.ctrlKey && !e.altKey && !commandMenuOpen && !shortcutsOpen) {
        e.preventDefault();
        setChordPending("g");
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        chordTimerRef.current = setTimeout(() => {
          setChordPending(null);
        }, 1500);
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts);
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    };
  }, [chordPending, commandMenuOpen, shortcutsOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [path]);

  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = mobileDrawerRef.current;
    const focusable = () =>
      drawer?.querySelectorAll<HTMLElement>(
        "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
      ) ?? [];
    focusable()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        mobileTriggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

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
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground select-none">
        {/* Sidebar Brand Header */}
        <div
          className={cn(
            "flex h-14 items-center gap-2 border-b border-sidebar-border px-5",
            isCollapsed && "justify-center px-0",
          )}
        >
          <AppLink to="/" aria-label="Soho Suite home" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Logo collapsed={isCollapsed} />
          </AppLink>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="ml-auto inline-flex size-9 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Workspace Switcher */}
        {!isCollapsed && (
          <BusinessSwitcher
            businesses={businesses}
            businessId={businessId}
            businessName={businessName}
            onSelectBusiness={onSelectBusiness}
            onCreateWorkspace={onCreateWorkspace}
          />
        )}

        {/* Navigation Groups */}
        <nav aria-label="Main" className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
          {navGroups.map((group, groupIdx) => (
            <div key={group.label} className={cn("mt-4", groupIdx === 0 && "mt-1")}>
              {!isCollapsed ? (
                <p className="mb-1 px-3 text-xs font-medium text-sidebar-muted">
                  {group.label}
                </p>
              ) : (
                <div className="mx-auto my-2.5 h-px w-6 bg-sidebar-border" />
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
                        title={isCollapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                          isCollapsed && "justify-center px-0",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                            : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )}
                      >
                        {active && (
                          <span
                            aria-hidden
                            className="absolute top-1.5 bottom-1.5 left-0 w-0.75 rounded-r-full bg-sidebar-primary"
                          />
                        )}
                        <Icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            active
                              ? "text-sidebar-primary"
                              : "text-sidebar-muted group-hover:text-sidebar-foreground",
                          )}
                        />
                        {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                      </AppLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom User Area */}
        <div className={cn("border-t border-sidebar-border p-3", isCollapsed && "px-2")}>
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg border border-transparent p-1.5 transition-colors hover:border-sidebar-border hover:bg-sidebar-accent/50",
              isCollapsed && "justify-center p-1",
            )}
          >
            <Avatar initials={user.initials} size="sm" tone="brand" />
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-sidebar-foreground">{user.name}</p>
                  <p className="truncate text-[0.7rem] text-sidebar-muted">{user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSignOutConfirmOpen(true)}
                  aria-label="Sign out"
                  title="Sign out of Soho Suite"
                  className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-destructive-soft hover:text-destructive"
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
    <div className="min-h-screen w-full min-w-0 bg-background overflow-x-hidden">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border transition-[width] duration-200 lg:block",
          collapsed ? "w-18" : "w-64",
        )}
      >
        {sidebar(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 h-full w-full cursor-default bg-foreground/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => {
              setMobileOpen(false);
              mobileTriggerRef.current?.focus();
            }}
          />
          <aside
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            tabIndex={-1}
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-sidebar-border shadow-pop animate-in slide-in-from-left duration-200"
          >
            {sidebar(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className={cn("min-w-0 transition-[padding] duration-200", collapsed ? "lg:pl-18" : "lg:pl-64")}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          <Button
            ref={mobileTriggerRef}
            variant="ghost"
            size="icon-sm"
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden text-muted-foreground hover:text-foreground lg:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4.5" /> : <PanelLeftClose className="size-4.5" />}
          </Button>

          {/* Breadcrumb Context */}
          <div aria-label="Current page breadcrumb" className="flex min-w-0 items-center gap-2 text-xs">
            <span className="hidden font-medium text-muted-foreground sm:inline">Workspace</span>
            <span className="hidden text-muted-foreground/40 sm:inline">/</span>
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              {currentPage?.label ?? "Dashboard"}
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-surface-sunken px-2.5 py-0.5 text-[0.68rem] font-medium text-muted-foreground md:inline-flex">
              <span className="size-1.5 rounded-full bg-success" />
              {businessName}
            </span>
          </div>

          {/* Top Right Header Controls */}
          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            {/* Quick Search / Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setCommandMenuOpen(true)}
              aria-label={`Search or jump to (${isMac ? "Cmd+K" : "Ctrl+K"})`}
              className="group hidden sm:flex items-center gap-2 rounded-lg border border-border/80 bg-surface-sunken/70 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-border-strong hover:bg-surface-sunken hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary w-52 md:w-64"
            >
              <Search className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="truncate">Search commands...</span>
              <kbd className="ml-auto inline-flex items-center gap-0.5 rounded border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold text-muted-foreground shadow-2xs">
                <span className="text-[0.68rem]">{isMac ? "⌘" : "Ctrl"}</span>K
              </kbd>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="sm:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setCommandMenuOpen(true)}
              aria-label="Search or jump to"
            >
              <Search className="size-4.5" />
            </Button>

            <QuickCreateMenu />
            <ThemeToggle />

            {/* Profile Dropdown */}
            <div ref={profileMenuRef} className="relative">
              <button
                ref={profileTriggerRef}
                type="button"
                aria-label={`Account options for ${user.name}`}
                aria-expanded={profileOpen}
                aria-controls={profileMenuId}
                onClick={() => setProfileOpen((open) => !open)}
                className="group inline-flex min-h-9 items-center gap-2 rounded-full border border-border/60 bg-surface py-1 pl-1 pr-2.5 text-left shadow-xs transition-colors hover:border-border hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Avatar initials={user.initials} size="sm" tone="brand" />
                <span className="hidden max-w-32 truncate text-xs font-semibold text-foreground sm:inline">
                  {user.name}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform duration-150",
                    profileOpen && "rotate-180",
                  )}
                />
              </button>

              {profileOpen && (
                <div
                  id={profileMenuId}
                  aria-label="Account options"
                  className="absolute right-0 top-full z-50 mt-2 w-68 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-pop"
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <Avatar initials={user.initials} size="md" tone="brand" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-y border-border bg-surface-sunken/60 px-4 py-2 text-xs">
                    <span className="text-muted-foreground">Active business</span>
                    <span className="max-w-32 truncate font-semibold text-foreground">{businessName}</span>
                  </div>
                  <nav aria-label="Account settings" className="grid gap-0.5 p-1.5">
                    <AppLink
                      to="/settings/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-foreground transition-colors hover:bg-surface-sunken"
                    >
                      <Settings aria-hidden="true" className="size-4 text-muted-foreground" />
                      <span>Profile settings</span>
                    </AppLink>
                    <AppLink
                      to="/settings/business"
                      onClick={() => setProfileOpen(false)}
                      className="flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-foreground transition-colors hover:bg-surface-sunken"
                    >
                      <Building2 aria-hidden="true" className="size-4 text-muted-foreground" />
                      <span>Business settings</span>
                    </AppLink>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setShortcutsOpen(true);
                      }}
                      className="flex min-h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-sunken"
                    >
                      <div className="flex items-center gap-2.5">
                        <HelpCircle aria-hidden="true" className="size-4 text-muted-foreground" />
                        <span>Keyboard shortcuts</span>
                      </div>
                      <kbd className="font-mono text-xs text-muted-foreground">?</kbd>
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setSignOutConfirmOpen(true);
                      }}
                      className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive-soft"
                    >
                      <LogOut aria-hidden="true" className="size-4" />
                      <span>Sign out</span>
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main id="main" className="mx-auto w-full min-w-0 max-w-[1440px] px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          {children}
        </main>
      </div>

      {/* Global Command Menu & Shortcuts Modal */}
      {commandMenuOpen && (
        <CommandMenu
          open={commandMenuOpen}
          onClose={() => setCommandMenuOpen(false)}
          businesses={businesses}
          businessId={businessId}
          onSelectBusiness={onSelectBusiness}
          onOpenShortcuts={() => {
            setCommandMenuOpen(false);
            setShortcutsOpen(true);
          }}
        />
      )}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {signOutConfirmOpen && (
        <ConfirmDialog
          title="Sign out?"
          description="You’ll be signed out of Soho Suite on this device."
          confirmLabel="Sign out"
          destructive
          onCancel={() => setSignOutConfirmOpen(false)}
          onConfirm={() => {
            setSignOutConfirmOpen(false);
            onSignOut?.();
          }}
        />
      )}

      {/* Floating Chord Indicator (e.g. "G then...") */}
      {chordPending === "g" && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-primary/30 bg-surface px-4 py-2.5 text-xs font-medium text-foreground shadow-pop ring-1 ring-primary/20"
        >
          <div className="flex items-center gap-1.5">
            <kbd className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[0.68rem] font-bold text-primary">
              G
            </kbd>
            <span className="text-muted-foreground">then:</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-[0.72rem]">
            <span><kbd className="font-mono font-bold text-foreground">D</kbd> Dashboard</span>
            <span>·</span>
            <span><kbd className="font-mono font-bold text-foreground">A</kbd> Analytics</span>
            <span>·</span>
            <span><kbd className="font-mono font-bold text-foreground">S</kbd> Datasets</span>
            <span>·</span>
            <span><kbd className="font-mono font-bold text-foreground">E</kbd> Expenses</span>
            <span>·</span>
            <span><kbd className="font-mono font-bold text-foreground">I</kbd> Inventory</span>
            <span>·</span>
            <span><kbd className="font-mono font-bold text-foreground">T</kbd> Team</span>
          </div>
        </aside>
      )}
    </div>
  );
}

function BusinessSwitcher({
  businesses = [],
  businessId,
  businessName,
  onSelectBusiness,
  onCreateWorkspace,
}: Pick<AppShellProps, "businesses" | "businessId" | "businessName" | "onSelectBusiness" | "onCreateWorkspace">) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const optionsId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const canSwitch = businesses.length > 1 && Boolean(onSelectBusiness);
  const canOpenMenu = canSwitch || Boolean(onCreateWorkspace);

  function closeCreateDialog() {
    if (creating) return;
    setCreateOpen(false);
    setCreateError("");
    triggerRef.current?.focus();
  }

  async function submitCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreateWorkspace || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      await onCreateWorkspace(workspaceName);
      setCreateOpen(false);
      setWorkspaceName("");
      triggerRef.current?.focus();
    } catch (error) {
      setCreateError(formatApiError(error));
    } finally {
      setCreating(false);
    }
  }

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
    <div ref={rootRef} className="relative px-3 pt-3 pb-1">
      <button
        ref={triggerRef}
        type="button"
        aria-label={canOpenMenu ? `Open workspaces. Current workspace: ${businessName}` : `Current workspace: ${businessName}`}
        aria-expanded={canOpenMenu ? open : undefined}
        aria-controls={canOpenMenu ? optionsId : undefined}
        aria-disabled={canOpenMenu ? undefined : true}
        onClick={() => canOpenMenu && setOpen((value) => !value)}
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-sidebar-border bg-surface dark:bg-sidebar-accent/25 p-2 text-left shadow-2xs transition-all",
          canOpenMenu && "hover:bg-sidebar-accent/60 hover:border-border-strong cursor-pointer focus-visible:outline-2 focus-visible:outline-primary",
          !canOpenMenu && "cursor-default",
        )}
      >
        <span className="inline-flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-[#00008A] dark:bg-primary font-sans text-xs font-bold text-white dark:text-[#080b11] shadow-xs">
          {businessName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-sidebar-foreground">{businessName}</p>
          <div className="flex items-center gap-1.5 text-[0.68rem] text-sidebar-muted">
            <span className="size-1 rounded-full bg-emerald-500" />
            <span>Active workspace</span>
          </div>
        </div>
        {canOpenMenu && <ChevronsUpDown className="size-4 shrink-0 text-sidebar-muted" aria-hidden="true" />}
      </button>

      {open && canOpenMenu && (
        <div
          id={optionsId}
          aria-label="Workspaces"
          className="absolute inset-x-3 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-sidebar-border bg-popover p-1.5 text-popover-foreground shadow-pop"
        >
          <p className="px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspaces
          </p>
          <div role="group" aria-label="Available workspaces" className="max-h-60 overflow-y-auto">
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
                    "flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:outline-none",
                    selected && "bg-sidebar-accent/80 font-semibold text-sidebar-accent-foreground",
                  )}
                >
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/10 text-xs font-bold text-sidebar-primary">
                    {business.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{business.name}</span>
                  {selected && <Check className="size-3.5 shrink-0 text-sidebar-primary" aria-label="Current business" />}
                </button>
              );
            })}
          </div>
          {onCreateWorkspace && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setWorkspaceName("");
                setCreateError("");
                setCreateOpen(true);
              }}
              className="mt-1 flex min-h-9 w-full items-center gap-2.5 rounded-lg border-t border-sidebar-border px-2.5 pt-2 text-left text-xs font-semibold text-sidebar-primary transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:outline-none"
            >
              <Plus className="size-4" aria-hidden="true" />
              Create workspace
            </button>
          )}
        </div>
      )}

      {createOpen && (
        <Modal
          title="Create workspace"
          description="Create a separate workspace for another business or team. It will start with this workspace’s currency and fiscal year settings."
          onClose={closeCreateDialog}
          size="sm"
        >
          <form className="space-y-4 p-5" onSubmit={(event) => void submitCreateWorkspace(event)}>
            <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="new-workspace-name">
              Workspace name
              <input
                id="new-workspace-name"
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                maxLength={120}
                required
                autoComplete="organization"
                placeholder="e.g. Downtown Store"
              />
            </label>
            {createError && <p role="alert" className="text-sm text-destructive">{createError}</p>}
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={closeCreateDialog} disabled={creating}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={creating || !workspaceName.trim()}>
                {creating ? "Creating…" : "Create workspace"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function QuickCreateMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Create or add new"
        aria-expanded={open}
        className="inline-flex size-9 items-center justify-center rounded-lg bg-[#00008A] hover:bg-[#000070] dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-[#090e1f] shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
        title="Quick actions (+)"
      >
        <Plus className="size-4.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-pop">
          <p className="px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </p>
          <AppLink
            to="/datasets"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-sunken"
          >
            <Database className="size-4 text-primary" />
            <span>Import sales dataset</span>
          </AppLink>
          <AppLink
            to="/expenses"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-sunken"
          >
            <Receipt className="size-4 text-accent" />
            <span>Record business expense</span>
          </AppLink>
          <AppLink
            to="/inventory"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-sunken"
          >
            <Boxes className="size-4 text-success" />
            <span>Add inventory item</span>
          </AppLink>
          <AppLink
            to="/team"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-sunken"
          >
            <Users className="size-4 text-warning" />
            <span>Invite team member</span>
          </AppLink>
          <div className="my-1 border-t border-border/60" />
          <AppLink
            to="/reports"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-sunken"
          >
            <FileText className="size-4 text-info" />
            <span>Generate CSV report</span>
          </AppLink>
        </div>
      )}
    </div>
  );
}
