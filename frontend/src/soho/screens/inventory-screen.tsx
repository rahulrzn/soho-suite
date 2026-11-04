import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Boxes, DollarSign, PackageMinus, PackageX, Plus, RotateCcw, SlidersHorizontal, Undo2 } from "lucide-react";
import { useState } from "react";

import { cn } from "../../lib/utils";
import { Button } from "../components/button";
import { Sparkline } from "../components/charts";
import { DataTable, type Column } from "../components/data-table";
import { SearchInput, Select } from "../components/form";
import { PageHeader, Stat, StatStrip, UnderlineTabs } from "../components/misc";
import { Panel, PanelBody, PanelHeader } from "../components/panel";
import { StockStatusBadge } from "../components/status";
import { formatCurrency, formatNumber } from "../lib/format";
import type { InventoryItem, MovementType, StockMovement } from "../types";

export interface InventoryScreenProps {
  items: InventoryItem[];
  movements: StockMovement[];
  reorder: { sku: string; name: string; suggestedQty: number; supplier: string; leadTime: string; cost: number }[];
}

const movementMeta: Record<MovementType, { label: string; icon: typeof ArrowUpRight; cls: string }> = {
  received: { label: "Received", icon: ArrowDownLeft, cls: "bg-success-soft text-success" },
  sold: { label: "Sold", icon: ArrowUpRight, cls: "bg-primary-soft text-primary" },
  adjusted: { label: "Adjusted", icon: SlidersHorizontal, cls: "bg-warning-soft text-warning-foreground" },
  transferred: { label: "Transferred", icon: ArrowLeftRight, cls: "bg-info-soft text-info" },
  returned: { label: "Returned", icon: Undo2, cls: "bg-accent-soft text-accent-foreground" },
};

export function InventoryScreen({ items, movements, reorder }: InventoryScreenProps) {
  const [tab, setTab] = useState<"items" | "movements">("items");
  const [q, setQ] = useState("");
  const value = items.reduce((s, i) => s + i.onHand * i.unitCost, 0);
  const low = items.filter((i) => i.status === "low").length;
  const out = items.filter((i) => i.status === "out").length;
  const filtered = items.filter((i) => `${i.name} ${i.sku}`.toLowerCase().includes(q.toLowerCase()));

  const itemCols: Column<InventoryItem>[] = [
    {
      key: "name",
      header: "Item",
      sortValue: (i) => i.name,
      cell: (i) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{i.name}</p>
          <p className="num text-xs text-muted-foreground">
            {i.sku} · {i.category}
          </p>
        </div>
      ),
    },
    {
      key: "onHand",
      header: "On hand",
      sortValue: (i) => i.onHand,
      width: "180px",
      cell: (i) => {
        const max = Math.max(i.onHand, i.reorderPoint * 2);
        return (
          <div className="flex items-center gap-3">
            <span className={cn("num w-8 text-right font-medium", i.status === "out" ? "text-destructive" : "text-foreground")}>{i.onHand}</span>
            <div className="relative h-1.5 w-20 rounded-full bg-muted" aria-hidden>
              <div
                className={cn("h-full rounded-full", i.status === "in-stock" ? "bg-success" : i.status === "low" ? "bg-warning" : "bg-destructive")}
                style={{ width: `${(i.onHand / max) * 100}%` }}
              />
              <span className="absolute -top-1 h-3.5 w-0.5 rounded bg-foreground/50" style={{ left: `${(i.reorderPoint / max) * 100}%` }} />
            </div>
          </div>
        );
      },
    },
    { key: "location", header: "Location", hideBelow: "xl", cell: (i) => <span className="text-muted-foreground">{i.location}</span> },
    { key: "cost", header: "Unit cost", align: "right", hideBelow: "lg", cell: (i) => <span className="num">{formatCurrency(i.unitCost, { cents: true })}</span> },
    { key: "value", header: "Value", align: "right", hideBelow: "md", sortValue: (i) => i.onHand * i.unitCost, cell: (i) => <span className="num">{formatCurrency(i.onHand * i.unitCost)}</span> },
    { key: "velocity", header: "Sales / wk", align: "right", hideBelow: "lg", cell: (i) => <Sparkline values={i.velocity} width={72} height={22} fill={false} className="ml-auto" /> },
    { key: "status", header: "Status", align: "right", cell: (i) => <StockStatusBadge status={i.status} /> },
  ];

  const moveCols: Column<StockMovement>[] = [
    {
      key: "type",
      header: "Movement",
      cell: (m) => {
        const meta = movementMeta[m.type];
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-3">
            <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-lg", meta.cls)}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{m.item}</p>
              <p className="text-xs text-muted-foreground">
                {meta.label} · <span className="num">{m.sku}</span>
              </p>
            </div>
          </div>
        );
      },
    },
    { key: "ref", header: "Reference", hideBelow: "lg", cell: (m) => <span className="text-muted-foreground">{m.reference}</span> },
    { key: "by", header: "By", hideBelow: "md", cell: (m) => <span className="text-foreground/80">{m.by}</span> },
    { key: "when", header: "When", hideBelow: "sm", cell: (m) => <span className="text-muted-foreground">{m.date}, {m.time}</span> },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      cell: (m) => (
        <span className={cn("num font-semibold", m.qty > 0 ? "text-success" : "text-foreground")}>
          {m.qty > 0 ? `+${m.qty}` : `−${Math.abs(m.qty)}`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow="Operations"
        title="Inventory"
        description="Stock levels, value and every movement in and out."
        actions={
          <>
            <Button>
              <RotateCcw /> Start stock count
            </Button>
            <Button variant="primary">
              <Plus /> Record movement
            </Button>
          </>
        }
      />

      <StatStrip>
        <Stat icon={<Boxes />} label="Active SKUs" value={items.length} hint="Across 2 locations" />
        <Stat icon={<DollarSign />} label="Stock value" value={formatCurrency(value)} hint="At unit cost" />
        <Stat icon={<PackageMinus />} label="Low stock" value={low} hint="Below reorder point" />
        <Stat icon={<PackageX />} label="Out of stock" value={out} hint="Losing ~$380/day in sales" />
      </StatStrip>

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-8">
          <div className="flex flex-col gap-3 px-5 pt-4 md:flex-row md:items-end md:justify-between">
            <UnderlineTabs
              label="Inventory view"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "items", label: "Items", count: items.length },
                { value: "movements", label: "Stock movements", count: movements.length },
              ]}
            />
            <div className="flex gap-2 pb-3">
              <Select size_="sm" aria-label="Location" defaultValue="all" className="w-36">
                <option value="all">All locations</option>
                <option>Front store</option>
                <option>Warehouse B</option>
              </Select>
              {tab === "items" && <SearchInput placeholder="SKU or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" className="w-44" />}
            </div>
          </div>
          {tab === "items" ? (
            <DataTable caption="Inventory items" rows={filtered} columns={itemCols} getRowId={(i) => i.sku} />
          ) : (
            <DataTable caption="Stock movements" rows={movements} columns={moveCols} getRowId={(m) => m.id} />
          )}
        </Panel>

        <Panel className="xl:col-span-4">
          <PanelHeader title="Reorder suggestions" description="Based on sales velocity and supplier lead time" />
          <PanelBody className="space-y-3">
            {reorder.map((r) => (
              <div key={r.sku} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.supplier} · {r.leadTime} lead time
                    </p>
                  </div>
                  <span className="num shrink-0 rounded-md bg-primary-soft px-2 py-0.5 text-sm font-semibold text-primary">×{r.suggestedQty}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="num text-sm text-muted-foreground">≈ {formatCurrency(r.cost)}</span>
                  <Button size="sm">Create PO</Button>
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Total suggested: <span className="num font-medium text-foreground">{formatCurrency(reorder.reduce((s, r) => s + r.cost, 0))}</span> ·{" "}
              {formatNumber(reorder.reduce((s, r) => s + r.suggestedQty, 0))} units
            </p>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
