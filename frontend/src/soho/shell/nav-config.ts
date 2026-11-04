import {
  Activity,
  BarChart3,
  Boxes,
  Database,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { AppPath } from "../router-adapter";

export interface NavItem {
  label: string;
  to: AppPath;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard },
      { label: "Analytics", to: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Data",
    items: [
      { label: "Datasets", to: "/datasets", icon: Database },
      { label: "Reports", to: "/reports", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Expenses", to: "/expenses", icon: Receipt },
      { label: "Inventory", to: "/inventory", icon: Boxes },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Team", to: "/team", icon: Users },
      { label: "Activity", to: "/activity", icon: Activity },
      { label: "Settings", to: "/settings/business", icon: Settings },
    ],
  },
];

export function isActivePath(current: string, to: string) {
  if (to === "/") return current === "/";
  if (to === "/settings/business") return current.startsWith("/settings/");
  return current === to || current.startsWith(`${to}/`);
}
