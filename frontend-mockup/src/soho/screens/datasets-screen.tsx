import { Database, FileSpreadsheet, Gauge, RefreshCw, Rows3, Sheet, Store, TriangleAlert, Upload } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "../components/badge";
import { Button, buttonVariants } from "../components/button";
import { DataTable, type Column } from "../components/data-table";
import { SearchInput } from "../components/form";
import { Meter, PageHeader, Stat, StatStrip } from "../components/misc";
import { Panel, PanelBody, PanelHeader } from "../components/panel";
import { EmptyState, InlineAlert } from "../components/states";
import { DatasetStatusBadge } from "../components/status";
import { formatNumber } from "../lib/format";
import { AppLink } from "../router-adapter";
import type { ColumnProfile, Dataset } from "../types";

export interface DatasetsScreenProps {
  datasets: Dataset[];
  profiles: Record<string, ColumnProfile[]>;
}

const sourceIcon = { CSV: FileSpreadsheet, Excel: Sheet, "Google Sheets": Sheet, "POS export": Store };

const typeTone: Record<ColumnProfile["type"], string> = {
  text: "bg-muted text-muted-foreground",
  number: "bg-info-soft text-info",
  date: "bg-accent-soft text-accent-foreground",
  currency: "bg-success-soft text-success",
  category: "bg-primary-soft text-primary",
};

export function DatasetsScreen({ datasets, profiles }: DatasetsScreenProps) {
  const [selectedId, setSelectedId] = useState("d3");
  const [q, setQ] = useState("");
  const selected = datasets.find((d) => d.id === selectedId);
  const columns = profiles[selectedId];
  const filtered = datasets.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));

  const ready = datasets.filter((d) => d.status === "ready");
  const avgQuality = Math.round(ready.reduce((s, d) => s + d.quality, 0) / Math.max(1, ready.length));
  const totalRows = datasets.reduce((s, d) => s + d.rows, 0);

  const cols: Column<Dataset>[] = [
    {
      key: "name",
      header: "Dataset",
      sortValue: (d) => d.name,
      cell: (d) => {
        const Icon = sourceIcon[d.source];
        return (
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-sunken text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {d.source} · {d.sizeLabel}
              </p>
            </div>
          </div>
        );
      },
    },
    { key: "rows", header: "Rows", align: "right", hideBelow: "md", sortValue: (d) => d.rows, cell: (d) => <span className="num">{d.rows ? formatNumber(d.rows) : "—"}</span> },
    {
      key: "quality",
      header: "Quality",
      hideBelow: "sm",
      sortValue: (d) => d.quality,
      width: "140px",
      cell: (d) =>
        d.quality ? (
          <div className="flex items-center gap-2">
            <Meter value={d.quality} tone="auto" className="w-16" label={`${d.name} quality`} />
            <span className="num text-xs text-muted-foreground">{d.quality}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    { key: "updated", header: "Updated", hideBelow: "lg", cell: (d) => <span className="text-muted-foreground">{d.updatedAt}</span> },
    { key: "status", header: "Status", align: "right", cell: (d) => <DatasetStatusBadge status={d.status} /> },
  ];

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow="Data"
        title="Datasets"
        description="The files and exports that power your dashboards. Keep them fresh for accurate numbers."
        actions={
          <AppLink to="/datasets/upload" className={buttonVariants({ variant: "primary" })}>
            <Upload /> Upload dataset
          </AppLink>
        }
      />

      <StatStrip>
        <Stat icon={<Database />} label="Datasets" value={datasets.length} hint={`${ready.length} ready to use`} />
        <Stat icon={<Rows3 />} label="Total rows" value={formatNumber(totalRows, { compact: true })} hint="Across all sources" />
        <Stat icon={<Gauge />} label="Average quality" value={`${avgQuality}/100`} hint="Ready datasets only" />
        <Stat
          icon={<TriangleAlert />}
          label="Needs attention"
          value={datasets.filter((d) => d.status === "needs-review" || d.status === "failed").length}
          hint="1 review · 1 failed import"
        />
      </StatStrip>

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-7">
          <PanelHeader
            title="All datasets"
            actions={<SearchInput placeholder="Filter datasets" value={q} onChange={(e) => setQ(e.target.value)} className="w-48 sm:w-60" aria-label="Filter datasets" />}
          />
          <DataTable
            caption="Datasets"
            rows={filtered}
            columns={cols}
            getRowId={(d) => d.id}
            selectedId={selectedId}
            onRowClick={(d) => setSelectedId(d.id)}
            empty={<EmptyState icon={<Database />} title="No datasets match" description="Try a different name or clear the filter." />}
          />
        </Panel>

        <Panel className="xl:col-span-5">
          {selected ? (
            <>
              <PanelHeader
                eyebrow="Data quality"
                title={selected.name}
                description={`${formatNumber(selected.rows)} rows · ${selected.columns} columns · owned by ${selected.owner}`}
                actions={
                  <Button size="sm">
                    <RefreshCw /> Re-sync
                  </Button>
                }
              />
              {!columns ? (
                <EmptyState
                  icon={selected.status === "processing" ? <RefreshCw className="animate-spin" /> : <TriangleAlert />}
                  title={selected.status === "processing" ? "Profiling columns…" : selected.status === "failed" ? "Import failed" : "Profile unavailable"}
                  description={
                    selected.status === "failed"
                      ? "The file couldn't be read. It may be password-protected or use an unsupported format."
                      : "Column statistics will appear here once processing finishes."
                  }
                  action={selected.status === "failed" ? <Button variant="primary">Try again</Button> : undefined}
                />
              ) : (
                <PanelBody className="space-y-4">
                  <div className="flex items-center gap-4 rounded-xl bg-surface-sunken p-4">
                    <div className="num text-3xl font-semibold text-foreground">{selected.quality}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Quality score</p>
                      <Meter value={selected.quality} tone="auto" className="mt-1.5" label="Quality score" />
                    </div>
                  </div>
                  {selected.status === "needs-review" && (
                    <InlineAlert tone="warning" title="4 columns need a look">
                      Fixing these will improve cost and margin accuracy on your dashboard.
                    </InlineAlert>
                  )}
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {columns.map((c) => (
                      <li key={c.name} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <code className="num truncate text-sm text-foreground">{c.name}</code>
                            <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-medium uppercase", typeTone[c.type])}>
                              {c.type}
                            </span>
                          </div>
                          <span className="num shrink-0 text-xs text-muted-foreground">{c.completeness}% filled</span>
                        </div>
                        <Meter value={c.completeness} tone="auto" className="mt-2" label={`${c.name} completeness`} />
                        <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
                          <span className="truncate text-muted-foreground">
                            e.g. <span className="num text-foreground/80">{c.sample}</span>
                          </span>
                          {c.issue && <Badge tone="warning">{c.issue}</Badge>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              )}
            </>
          ) : (
            <EmptyState icon={<Database />} title="Select a dataset" description="Choose a dataset to see its column profile and quality checks." />
          )}
        </Panel>
      </div>
    </div>
  );
}
