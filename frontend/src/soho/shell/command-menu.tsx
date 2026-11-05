import {
  Boxes,
  Database,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  History,
  LayoutDashboard,
  Moon,
  Receipt,
  Search,
  Settings,
  Sun,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { navigate } from "../../app/navigation";
import { cn } from "../../lib/utils";
import { toggleTheme } from "../theme";

export interface CommandItem {
  id: string;
  category: "Navigation" | "Actions" | "Workspaces";
  title: string;
  subtitle?: string;
  icon: typeof LayoutDashboard;
  keywords?: string[];
  action: () => void;
  shortcut?: string;
}

export function CommandMenu({
  open,
  onClose,
  businesses = [],
  businessId,
  onSelectBusiness,
  onOpenShortcuts,
}: {
  open: boolean;
  onClose: () => void;
  businesses?: { id: number; name: string }[];
  businessId?: number;
  onSelectBusiness?: (id: number) => void;
  onOpenShortcuts?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      {
        id: "nav-overview",
        category: "Navigation",
        title: "Dashboard",
        subtitle: "Overview, KPIs, and business health",
        icon: LayoutDashboard,
        keywords: ["home", "dashboard", "revenue", "kpi", "overview"],
        shortcut: "G D",
        action: () => navigate("/overview"),
      },
      {
        id: "nav-analytics",
        category: "Navigation",
        title: "Sales Analytics",
        subtitle: "Revenue trends and period performance",
        icon: TrendingUp,
        keywords: ["sales", "performance", "trends", "metrics", "analytics"],
        shortcut: "G A",
        action: () => navigate("/analytics"),
      },
      {
        id: "nav-datasets",
        category: "Navigation",
        title: "Datasets",
        subtitle: "Imported spreadsheets, POS, and sales data",
        icon: Database,
        keywords: ["data", "csv", "excel", "sheets", "upload", "import"],
        shortcut: "G S",
        action: () => navigate("/datasets"),
      },
      {
        id: "nav-expenses",
        category: "Navigation",
        title: "Expenses",
        subtitle: "Operational spending and cost records",
        icon: Receipt,
        keywords: ["spending", "costs", "purchases", "receipts", "expenses"],
        shortcut: "G E",
        action: () => navigate("/expenses"),
      },
      {
        id: "nav-inventory",
        category: "Navigation",
        title: "Inventory & Stock",
        subtitle: "Product catalogue, stock ledger, and adjustments",
        icon: Boxes,
        keywords: ["stock", "products", "sku", "reorder", "inventory"],
        shortcut: "G I",
        action: () => navigate("/inventory"),
      },
      {
        id: "nav-reports",
        category: "Navigation",
        title: "Reports & Exports",
        subtitle: "Download CSV summaries for accounting and taxes",
        icon: FileText,
        keywords: ["export", "csv", "download", "taxes", "reports"],
        shortcut: "G R",
        action: () => navigate("/reports"),
      },
      {
        id: "nav-team",
        category: "Navigation",
        title: "Team & Permissions",
        subtitle: "Manage business members and invitations",
        icon: Users,
        keywords: ["members", "roles", "owners", "collaborators", "team"],
        shortcut: "G T",
        action: () => navigate("/team"),
      },
      {
        id: "nav-activity",
        category: "Navigation",
        title: "Activity Audit Log",
        subtitle: "Timeline of workspace changes and updates",
        icon: History,
        keywords: ["audit", "log", "timeline", "history", "events", "activity"],
        shortcut: "G L",
        action: () => navigate("/activity"),
      },
      {
        id: "nav-settings-biz",
        category: "Navigation",
        title: "Business Settings",
        subtitle: "Currency, fiscal year, and workspace profile",
        icon: Settings,
        keywords: ["company", "currency", "fiscal", "workspace", "settings"],
        action: () => navigate("/settings/business"),
      },
      {
        id: "nav-settings-prof",
        category: "Navigation",
        title: "Profile Settings",
        subtitle: "Personal account, name, and contact details",
        icon: User,
        keywords: ["account", "password", "email", "profile"],
        action: () => navigate("/settings/profile"),
      },
      {
        id: "action-theme",
        category: "Actions",
        title: "Toggle Theme",
        subtitle: "Switch between light and dark visual appearance",
        icon: typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? Sun : Moon,
        keywords: ["dark", "light", "mode", "theme", "appearance"],
        shortcut: "T",
        action: () => toggleTheme(),
      },
      {
        id: "action-shortcuts",
        category: "Actions",
        title: "Keyboard Shortcuts",
        subtitle: "View all available hotkeys and shortcuts",
        icon: HelpCircle,
        keywords: ["hotkeys", "keys", "commands", "help", "shortcuts"],
        shortcut: "?",
        action: () => onOpenShortcuts?.(),
      },
    ];

    if (businesses.length > 1 && onSelectBusiness) {
      for (const biz of businesses) {
        if (biz.id !== businessId) {
          list.push({
            id: `biz-${biz.id}`,
            category: "Workspaces",
            title: `Switch to ${biz.name}`,
            subtitle: `Business ID #${biz.id}`,
            icon: FileSpreadsheet,
            keywords: ["workspace", "company", "switch", biz.name],
            action: () => onSelectBusiness(biz.id),
          });
        }
      }
    }

    return list;
  }, [businesses, businessId, onSelectBusiness, onOpenShortcuts]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    const cleanQ = q.replace(/[\s\-_]+/g, "");
    return items.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
      const matchKeyword = item.keywords?.some((k) => k.toLowerCase().includes(q));
      const matchShortcut = item.shortcut?.toLowerCase().replace(/[\s\-_]+/g, "").includes(cleanQ);
      return matchTitle || matchSubtitle || matchKeyword || matchShortcut;
    });
  }, [items, query]);

  useEffect(() => {
    if (open) {
      const focusTimeout = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(focusTimeout);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          selected.action();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>("[data-active='true']");
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[14vh] backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-surface/95 text-foreground shadow-2xl backdrop-blur-2xl">
        {/* Seamless Search Bar (Linear / Raycast Style) */}
        <div className="relative flex h-14 items-center gap-3 border-b border-border/60 px-4">
          <Search className="size-4.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="borderless-input w-full border-0 border-none bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-none outline-none ring-0 focus:border-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
            style={{ border: "none", outline: "none", boxShadow: "none" }}
            aria-label="Search commands"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-surface-sunken hover:text-foreground cursor-pointer"
              aria-label="Clear query"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border/80 bg-surface-sunken/80 px-1.5 py-0.5 font-mono text-[0.62rem] font-medium text-muted-foreground">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <ul ref={listRef} className="max-h-[360px] overflow-y-auto p-2 scrollbar-thin space-y-0.5">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No commands found for <span className="font-semibold text-foreground">"{query}"</span>.
            </li>
          ) : (
            filtered.map((item, idx) => {
              const active = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  data-active={active ? "true" : "false"}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "group flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-100 select-none",
                    active
                      ? "bg-surface-sunken/90 text-foreground ring-1 ring-border shadow-xs"
                      : "text-muted-foreground hover:bg-surface-sunken/50 hover:text-foreground",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        active
                          ? "border-primary/30 bg-primary/10 text-primary shadow-2xs"
                          : "border-border/60 bg-surface-sunken/60 text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate font-medium text-xs sm:text-sm", active ? "text-foreground font-semibold" : "text-foreground/90")}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="truncate text-[0.72rem] text-muted-foreground">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.shortcut && (
                    <div className="flex items-center gap-1 shrink-0">
                      {item.shortcut.split(" ").map((k) => (
                        <kbd
                          key={k}
                          className={cn(
                            "rounded border px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold tracking-wider",
                            active
                              ? "border-border-strong bg-surface text-foreground shadow-2xs"
                              : "border-border/70 bg-surface-sunken/80 text-muted-foreground",
                          )}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>

        {/* Footer Hint (Linear / Raycast Style) */}
        <div className="flex items-center justify-between border-t border-border/60 bg-surface-sunken/40 px-4 py-2.5 text-[0.72rem] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border/80 bg-surface px-1 py-0.5 font-mono text-[0.62rem] font-semibold text-foreground">↑</kbd>
              <kbd className="rounded border border-border/80 bg-surface px-1 py-0.5 font-mono text-[0.62rem] font-semibold text-foreground">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold text-foreground">↵</kbd>
              <span>Select</span>
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold text-foreground">esc</kbd>
              <span>Close</span>
            </span>
          </div>
          <span className="font-semibold text-muted-foreground/80">Soho Command</span>
        </div>
      </div>
    </div>
  );
}
