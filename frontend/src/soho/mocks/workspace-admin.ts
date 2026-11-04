/** MOCK DATA — visual prototype only (reports, team, activity). */
import type {
  ActivityEvent,
  Invitation,
  Permission,
  ReportItem,
  ReportTemplate,
  ScheduledReport,
  TeamMember,
} from "../types";

export const mockReportTemplates: ReportTemplate[] = [
  { id: "t1", title: "Profit & loss", description: "Revenue, cost of goods and operating expenses with margin trends.", type: "Financial", visual: "bars" },
  { id: "t2", title: "Cash flow summary", description: "Money in and out, runway and upcoming obligations.", type: "Financial", visual: "line" },
  { id: "t3", title: "Inventory valuation", description: "Stock on hand by category, aging and reorder exposure.", type: "Inventory", visual: "donut" },
  { id: "t4", title: "Sales by channel", description: "Channel, product and weekday performance for any period.", type: "Operations", visual: "table" },
];

export const mockReports: ReportItem[] = [
  { id: "r1", title: "Profit & loss · October 2026", type: "Financial", period: "Oct 1 – Oct 31", generatedAt: "Nov 1, 9:00 AM", status: "ready", format: "PDF", size: "412 KB", author: "Scheduled" },
  { id: "r2", title: "Inventory valuation · Q3", type: "Inventory", period: "Jul 1 – Sep 30", generatedAt: "Oct 3, 2:14 PM", status: "ready", format: "XLSX", size: "1.2 MB", author: "Ana Ortiz" },
  { id: "r3", title: "Sales by channel · November MTD", type: "Operations", period: "Nov 1 – Nov 4", generatedAt: "Generating…", status: "generating", format: "PDF", author: "Priya Raman" },
  { id: "r4", title: "Expense export · October", type: "Financial", period: "Oct 1 – Oct 31", generatedAt: "Nov 1, 9:02 AM", status: "ready", format: "CSV", size: "88 KB", author: "Scheduled" },
  { id: "r5", title: "Team activity · Q3", type: "Team", period: "Jul 1 – Sep 30", generatedAt: "Oct 2, 11:40 AM", status: "failed", format: "PDF", author: "Marcus Bell" },
];

export const mockScheduledReports: ScheduledReport[] = [
  { id: "s1", title: "Weekly sales digest", cadence: "Every Monday, 8:00 AM", nextRun: "Nov 9", recipients: 4 },
  { id: "s2", title: "Monthly profit & loss", cadence: "1st of month, 9:00 AM", nextRun: "Dec 1", recipients: 2 },
  { id: "s3", title: "Low stock alert", cadence: "Daily, 7:00 AM", nextRun: "Tomorrow", recipients: 3 },
];

export const mockReportPreview = {
  title: "Profit & loss",
  period: "October 2026",
  lines: [
    { label: "Revenue", value: 74950, emphasis: true },
    { label: "Cost of goods sold", value: -40330 },
    { label: "Gross profit", value: 34620, emphasis: true },
    { label: "Payroll", value: -12840 },
    { label: "Rent", value: -8200 },
    { label: "Marketing", value: -2100 },
    { label: "Other operating", value: -3560 },
    { label: "Net operating income", value: 7920, emphasis: true },
  ],
  bars: [48, 52, 59, 62, 66, 64, 70, 71, 70, 75],
};

export const mockTeam: TeamMember[] = [
  { id: "u1", name: "Priya Raman", email: "priya@juniperandco.com", role: "Owner", status: "active", lastActive: "Now", initials: "PR" },
  { id: "u2", name: "Marcus Bell", email: "marcus@juniperandco.com", role: "Admin", status: "active", lastActive: "12 min ago", initials: "MB" },
  { id: "u3", name: "Ana Ortiz", email: "ana@juniperandco.com", role: "Manager", status: "active", lastActive: "1 hr ago", initials: "AO" },
  { id: "u4", name: "Jonah Kim", email: "jonah@juniperandco.com", role: "Manager", status: "active", lastActive: "Yesterday", initials: "JK" },
  { id: "u5", name: "Lena Fischer", email: "lena@ledgerline.co", role: "Analyst", status: "active", lastActive: "3 days ago", initials: "LF" },
  { id: "u6", name: "Theo Grant", email: "theo@juniperandco.com", role: "Viewer", status: "suspended", lastActive: "Sep 14", initials: "TG" },
];

export const mockInvitations: Invitation[] = [
  { id: "inv1", email: "sam.oduya@juniperandco.com", role: "Manager", sentAt: "2 days ago", expiresIn: "5 days", invitedBy: "Priya Raman" },
  { id: "inv2", email: "accounts@harbourbooks.com", role: "Analyst", sentAt: "6 days ago", expiresIn: "1 day", invitedBy: "Marcus Bell" },
];

export const mockPermissions: Permission[] = [
  { capability: "View dashboards & analytics", roles: ["Owner", "Admin", "Manager", "Analyst", "Viewer"] },
  { capability: "Upload & manage datasets", roles: ["Owner", "Admin", "Manager", "Analyst"] },
  { capability: "Record expenses", roles: ["Owner", "Admin", "Manager"] },
  { capability: "Approve expenses", roles: ["Owner", "Admin"] },
  { capability: "Adjust inventory", roles: ["Owner", "Admin", "Manager"] },
  { capability: "Generate & schedule reports", roles: ["Owner", "Admin", "Manager", "Analyst"] },
  { capability: "Invite & manage team", roles: ["Owner", "Admin"] },
  { capability: "Business settings & billing", roles: ["Owner"] },
];

export const mockActivity: ActivityEvent[] = [
  { id: "a1", actor: "Jonah Kim", actorInitials: "JK", action: "received stock for", target: "Walnut serving board (+24)", module: "Inventory", day: "Today", time: "9:15 AM" },
  { id: "a2", actor: "Priya Raman", actorInitials: "PR", action: "uploaded dataset", target: "POS transactions · Nov 2026", module: "Datasets", day: "Today", time: "8:14 AM", detail: "18,432 rows · quality score 97" },
  { id: "a3", actor: "Marcus Bell", actorInitials: "MB", action: "approved expense", target: "Meta Ads · $750.00", module: "Expenses", day: "Today", time: "7:48 AM" },
  { id: "a4", actor: "System", actorInitials: "SS", action: "generated scheduled report", target: "Profit & loss · October 2026", module: "Reports", day: "Yesterday", time: "9:00 AM" },
  { id: "a5", actor: "Ana Ortiz", actorInitials: "AO", action: "flagged expense", target: "Uline · $389.15", module: "Expenses", day: "Yesterday", time: "4:31 PM", detail: "Missing receipt" },
  { id: "a6", actor: "Priya Raman", actorInitials: "PR", action: "invited", target: "sam.oduya@juniperandco.com as Manager", module: "Team", day: "Yesterday", time: "2:05 PM" },
  { id: "a7", actor: "Marcus Bell", actorInitials: "MB", action: "updated", target: "fiscal year start to January", module: "Settings", day: "Nov 1", time: "11:12 AM" },
  { id: "a8", actor: "Jonah Kim", actorInitials: "JK", action: "adjusted stock for", target: "Speckled stoneware bowl (−2)", module: "Inventory", day: "Nov 1", time: "3:02 PM", detail: "Reason: damaged in storage" },
  { id: "a9", actor: "Ana Ortiz", actorInitials: "AO", action: "resolved 3 issues in", target: "Supplier price list 2026", module: "Datasets", day: "Nov 1", time: "10:20 AM" },
];
