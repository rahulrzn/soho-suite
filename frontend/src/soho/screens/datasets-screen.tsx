import { Database, FileSpreadsheet, Rows3, Sheet, Store, TriangleAlert, Upload } from "lucide-react";
import { useState } from "react";

import { cn } from "../../lib/utils";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { DataTable, type Column } from "../components/data-table";
import { SearchInput } from "../components/form";
import { Meter, PageHeader, Stat, StatStrip } from "../components/misc";
import { Panel, PanelBody, PanelHeader } from "../components/panel";
import { EmptyState } from "../components/states";
import { DatasetStatusBadge } from "../components/status";
import { formatNumber } from "../lib/format";
import type { ColumnProfile, Dataset } from "../types";

export interface DatasetsScreenProps {
  datasets: Dataset[];
  profiles: Record<string, ColumnProfile[]>;
  query?: string;
  onQueryChange?: (query: string) => void;
  onUpload?: () => void;
  onOpenDataset?: (id: string) => void;
}

const sourceIcon = { CSV: FileSpreadsheet, Excel: Sheet, "Google Sheets": Sheet, "POS export": Store };

const typeTone: Record<ColumnProfile["type"], string> = {
  text: "bg-muted text-muted-foreground",
  number: "bg-info-soft text-info",
  date: "bg-accent-soft text-accent-foreground",
  currency: "bg-success-soft text-success",
  category: "bg-primary-soft text-primary",
};

export function DatasetsScreen({ datasets, profiles, query = "", onQueryChange, onUpload, onOpenDataset }: DatasetsScreenProps) {
  const [selectedId, setSelectedId] = useState(() => datasets[0]?.id ?? "");
  const selected = datasets.find((d) => d.id === selectedId) ?? datasets[0];
  const columns = profiles[selected?.id ?? selectedId];
  const filtered = datasets.filter((d) => `${d.name} ${d.source} ${d.status}`.toLowerCase().includes(query.trim().toLowerCase()));

  const ready = datasets.filter((d) => d.status === "ready");
  const totalRows = datasets.reduce((s, d) => s + d.rows, 0);

  const cols: Column<Dataset>[] = [
    {
      key: "name",
      header: "Dataset",
      sortValue: (d) => d.name,
      cell: (d) => {
        const Icon = sourceIcon[d.source as keyof typeof sourceIcon] ?? FileSpreadsheet;
        return (
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-sunken text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {d.source}{d.sizeLabel ? ` · ${d.sizeLabel}` : ""}
                {d.description ? ` · ${d.description}` : ""}
              </p>
            </div>
          </div>
        );
      },
    },
    { key: "rows", header: "Rows", align: "right", hideBelow: "md", sortValue: (d) => d.rows, cell: (d) => <span className="num">{d.rows ? formatNumber(d.rows) : "—"}</span> },
    { key: "updated", header: "Added", hideBelow: "lg", cell: (d) => <span className="text-muted-foreground">{d.updatedAt}</span> },
    { key: "status", header: "Status", align: "right", cell: (d) => <DatasetStatusBadge status={d.status} /> },
  ];

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow="Data"
        title="Datasets"
        description="The files and exports that power your dashboards. Keep them fresh for accurate numbers."
        actions={
          <Button variant="primary" onClick={onUpload}>
            <Upload /> Upload dataset
          </Button>
        }
      />

      <StatStrip>
        <Stat icon={<Database />} label="Datasets" value={datasets.length} hint={`${ready.length} ready to use`} />
        <Stat icon={<Rows3 />} label="Total rows" value={formatNumber(totalRows, { compact: true })} hint="Across all sources" />
        <Stat icon={<Rows3 />} label="Imported" value={ready.length} hint="Confirmed datasets" />
        <Stat
          icon={<TriangleAlert />}
          label="Needs attention"
          value={datasets.filter((d) => d.status === "needs-review" || d.status === "failed").length}
          hint="Uploaded files awaiting confirmation"
        />
      </StatStrip>

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-7">
          <PanelHeader
            title="All datasets"
            actions={<SearchInput placeholder="Filter datasets" value={query} onChange={(e) => onQueryChange?.(e.target.value)} className="w-48 sm:w-60" aria-label="Filter datasets" />}
          />
          <DataTable
            caption="Datasets"
            rows={filtered}
            columns={cols}
            getRowId={(d) => d.id}
            selectedId={selected?.id}
            onRowClick={(d) => setSelectedId(d.id)}
            empty={<EmptyState icon={<Database />} title="No datasets match" description="Try a different name or clear the filter." />}
          />
        </Panel>

        <Panel className="xl:col-span-5">
          {selected ? (
            <>
              <PanelHeader
                eyebrow="Dataset details"
                title={selected.name}
                description={`${formatNumber(selected.rows)} rows · ${selected.columns} columns · ${selected.source} · ${selected.updatedAt}`}
                actions={<DatasetStatusBadge status={selected.status} />}
              />
              {columns?.length ? (
                <PanelBody className="space-y-4">
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
              ) : <PanelBody className="space-y-3"><p className="text-sm text-muted-foreground">Column profiles and quality scores are not provided by this API. Open the dataset to review stored rows and backend findings.</p><Button variant="secondary" onClick={() => onOpenDataset?.(selected.id)}>Open dataset</Button></PanelBody>}
            </>
          ) : (
            <EmptyState icon={<Database />} title="Select a dataset" description="Choose a dataset to see its column profile and quality checks." />
          )}
        </Panel>
      </div>
    </div>
  );
}
