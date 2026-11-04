import { Paperclip, Plus, Receipt, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "../components/button";
import { ChartLegend, StackedBarChart, type SeriesDef } from "../components/charts";
import { DataTable, type Column } from "../components/data-table";
import { Field, Input, SearchInput, Select, Textarea } from "../components/form";
import { Avatar, PageHeader, Segmented } from "../components/misc";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../components/panel";
import { Drawer, EmptyState } from "../components/states";
import { ExpenseStatusBadge } from "../components/status";
import { formatCurrency } from "../lib/format";
import type { BudgetLine, Expense, TrendPoint } from "../types";

export interface ExpensesScreenProps {
  expenses: Expense[];
  budget: BudgetLine[];
  byMonth: TrendPoint[];
  categories: string[];
  /** Wire to your create-expense API call */
  onCreateExpense?: (form: FormData) => void;
}

const series: SeriesDef[] = [
  { key: "payroll", label: "Payroll", color: "var(--chart-1)" },
  { key: "rent", label: "Rent", color: "var(--chart-4)" },
  { key: "inventory", label: "Inventory", color: "var(--chart-2)" },
  { key: "other", label: "Other", color: "var(--chart-3)" },
];

type StatusFilter = "all" | Expense["status"];

export function ExpensesScreen({ expenses, budget, byMonth, categories, onCreateExpense }: ExpensesScreenProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState(categories[0]);
  const [q, setQ] = useState("");

  const spent = budget.reduce((s, b) => s + b.spent, 0);
  const total = budget.reduce((s, b) => s + b.budget, 0);

  const rows = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (status === "all" || e.status === status) &&
          (category === categories[0] || e.category === category) &&
          e.vendor.toLowerCase().includes(q.toLowerCase()),
      ),
    [expenses, status, category, q, categories],
  );

  const columns: Column<Expense>[] = [
    { key: "date", header: "Date", cell: (e) => <span className="num text-muted-foreground">{e.date}</span>, width: "80px" },
    {
      key: "vendor",
      header: "Vendor",
      sortValue: (e) => e.vendor,
      cell: (e) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            {e.vendor}
            {e.hasReceipt && <Paperclip className="size-3 text-muted-foreground" aria-label="Receipt attached" />}
          </p>
          <p className="text-xs text-muted-foreground md:hidden">{e.category}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", hideBelow: "md", cell: (e) => <span className="text-foreground/80">{e.category}</span> },
    { key: "method", header: "Method", hideBelow: "xl", cell: (e) => <span className="text-muted-foreground">{e.method}</span> },
    {
      key: "by",
      header: "Submitted by",
      hideBelow: "lg",
      cell: (e) => (
        <span className="flex items-center gap-2 text-foreground/80">
          <Avatar size="sm" initials={e.submittedBy.split(" ").map((n) => n[0]).join("")} />
          {e.submittedBy}
        </span>
      ),
    },
    { key: "status", header: "Status", hideBelow: "sm", cell: (e) => <ExpenseStatusBadge status={e.status} /> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortValue: (e) => e.amount,
      cell: (e) => <span className="num font-medium text-foreground">{formatCurrency(e.amount, { cents: true })}</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow="Operations"
        title="Expenses"
        description="Track spending against budget and keep receipts in one place."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus /> Add expense
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-5">
          <PanelHeader eyebrow="November" title="Budget" description={`${formatCurrency(total - spent)} left this month`} />
          <PanelBody>
            {/* Budget overview bar */}
            <div className="mb-5 rounded-xl bg-surface-sunken p-4">
              <div className="flex items-baseline justify-between">
                <span className="num text-2xl font-semibold text-foreground">{formatCurrency(spent)}</span>
                <span className="num text-sm text-muted-foreground">of {formatCurrency(total)}</span>
              </div>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="bg-primary" style={{ width: `${(spent / total) * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {Math.round((spent / total) * 100)}% used · 87% of the month elapsed
              </p>
            </div>
            <ul className="space-y-3.5">
              {budget.map((b) => {
                const pct = (b.spent / b.budget) * 100;
                const over = pct > 100;
                return (
                  <li key={b.category}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-foreground">{b.category}</span>
                      <span className={cn("num text-xs", over ? "font-semibold text-destructive" : "text-muted-foreground")}>
                        {formatCurrency(b.spent)} / {formatCurrency(b.budget)}
                      </span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", over ? "bg-destructive" : pct > 90 ? "bg-warning" : "bg-primary")}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-7">
          <PanelHeader title="Spending by month" description="Last 6 months, by category group" actions={<ChartLegend series={series} />} />
          <PanelBody>
            <StackedBarChart data={byMonth} series={series} height={300} ariaLabel="Stacked bar chart of monthly expenses by category" />
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-col gap-3 px-5 pt-5 pb-4 md:flex-row md:items-center md:justify-between">
          <Segmented
            label="Status"
            size="sm"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "flagged", label: "Flagged" },
              { value: "approved", label: "Approved" },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Select size_="sm" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <SearchInput placeholder="Search vendors" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search vendors" className="w-52" />
          </div>
        </div>
        <DataTable
          caption="Expenses"
          rows={rows}
          columns={columns}
          getRowId={(e) => e.id}
          empty={
            <EmptyState
              icon={<Receipt />}
              title="No expenses match these filters"
              description="Try another status or category."
              action={<Button onClick={() => { setStatus("all"); setCategory(categories[0]); setQ(""); }}>Clear filters</Button>}
            />
          }
          footer={
            <PanelFooter>
              <span>{rows.length} expenses</span>
              <span className="num font-medium text-foreground">
                {formatCurrency(rows.reduce((s, e) => s + e.amount, 0), { cents: true })}
              </span>
            </PanelFooter>
          }
        />
      </Panel>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add expense"
        description="Record a purchase or bill."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="expense-form">
              Save expense
            </Button>
          </>
        }
      >
        <form
          id="expense-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onCreateExpense?.(new FormData(e.currentTarget));
            setOpen(false);
          }}
        >
          <Field label="Vendor" htmlFor="vendor">
            <Input id="vendor" name="vendor" placeholder="e.g. Pacific Freight Co." required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" htmlFor="amount">
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" className="num pl-7" required />
              </div>
            </Field>
            <Field label="Date" htmlFor="date">
              <Input id="date" name="date" type="date" defaultValue="2026-11-04" />
            </Field>
          </div>
          <Field label="Category" htmlFor="category">
            <Select id="category" name="category">
              {categories.slice(1).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Payment method" htmlFor="method">
            <Select id="method" name="method">
              <option>Card</option>
              <option>Bank transfer</option>
              <option>Cash</option>
              <option>Invoice</option>
            </Select>
          </Field>
          <Field label="Receipt" optional>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface-sunken/50 p-4 text-sm text-muted-foreground hover:border-primary">
              <Wallet className="size-5 text-primary" />
              <span>
                <span className="font-medium text-foreground">Attach a photo or PDF</span>
                <br />
                JPG, PNG or PDF up to 10 MB
              </span>
              <input type="file" name="receipt" className="sr-only" accept="image/*,.pdf" />
            </label>
          </Field>
          <Field label="Notes" htmlFor="notes" optional>
            <Textarea id="notes" name="notes" placeholder="What was this for?" />
          </Field>
        </form>
      </Drawer>
    </div>
  );
}
