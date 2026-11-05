import {
  Calendar,
  CheckCircle2,
  Columns3,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Rows3,
  Sheet,
  Sparkles,
  Store,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useState } from "react";

import { Button } from "../components/button";
import { DataTable, type Column } from "../components/data-table";
import { SearchInput } from "../components/form";
import { PageHeader, Stat, StatStrip } from "../components/misc";
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
  onConfirmDataset?: (id: string) => void;
  onDeleteDataset?: (id: string) => void;
}

const sourceIcon = {
  CSV: FileSpreadsheet,
  Excel: Sheet,
  "Google Sheets": Sheet,
  "POS export": Store,
};

export function DatasetsScreen({
  datasets,
  query = "",
  onQueryChange,
  onUpload,
  onOpenDataset,
  onConfirmDataset,
  onDeleteDataset,
}: DatasetsScreenProps) {
  const [selectedId, setSelectedId] = useState(() => datasets[0]?.id ?? "");
  const selected = datasets.find((d) => d.id === selectedId) ?? datasets[0];
  const filtered = datasets.filter((d) =>
    `${d.name} ${d.source}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

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
          <div className="flex items-center gap-3 py-1">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-surface-sunken text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground text-sm tracking-tight">{d.name}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs">
                <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase bg-surface-sunken text-muted-foreground border border-border/80">
                  {d.source}
                </span>
                {d.description && (
                  <span className="truncate text-muted-foreground">{d.description}</span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "rows",
      header: "Rows",
      align: "right",
      sortValue: (d) => d.rows,
      cell: (d) => (
        <span className="font-mono text-xs font-medium text-foreground/90">
          {d.rows ? formatNumber(d.rows) : "0"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (d) => <DatasetStatusBadge status={d.status} />,
    },
    {
      key: "updated",
      header: "Added",
      align: "right",
      hideBelow: "md",
      cell: (d) => <span className="font-mono text-xs text-muted-foreground">{d.updatedAt}</span>,
    },
  ];

  return (
    <div className="space-y-6">
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
        <Stat
          icon={<Database />}
          tone="primary"
          label="Datasets"
          value={datasets.length}
          hint={`${ready.length} ready to use`}
        />
        <Stat
          icon={<Rows3 />}
          tone="info"
          label="Total rows"
          value={formatNumber(totalRows, { compact: true })}
          hint="Across all sources"
        />
        <Stat
          icon={<CheckCircle2 />}
          tone="success"
          label="Imported"
          value={ready.length}
          hint="Confirmed datasets"
        />
        <Stat
          icon={<TriangleAlert />}
          tone="warning"
          label="Needs attention"
          value={datasets.filter((d) => d.status === "needs-review" || d.status === "failed").length}
          hint="Uploaded files awaiting confirmation"
        />
      </StatStrip>

      <div className="grid gap-6 xl:grid-cols-12">
        {/* Left: Datasets Library List */}
        <Panel className="xl:col-span-7 xl:min-h-60">
          <PanelHeader
            eyebrow="Dataset library"
            title="All datasets"
            description="Select a dataset to view operating metrics, schema details, or inspect rows."
            className="min-h-[7.5rem]"
            actions={
              <SearchInput
                placeholder="Filter datasets"
                value={query}
                onChange={(e) => onQueryChange?.(e.target.value)}
                className="w-48 sm:w-60"
                aria-label="Filter datasets"
              />
            }
          />
          <DataTable
            className="max-h-[460px] overflow-y-auto"
            caption="Datasets"
            rows={filtered}
            columns={cols}
            getRowId={(d) => d.id}
            selectedId={selected?.id}
            onRowClick={(d) => setSelectedId(d.id)}
            empty={
              datasets.length === 0 ? (
                <EmptyState
                  icon={<Database />}
                  title="No datasets yet"
                  description="Upload a CSV or Excel file to start organizing your business data."
                  action={
                    onUpload && (
                      <Button variant="primary" onClick={onUpload}>
                        <Upload /> Upload dataset
                      </Button>
                    )
                  }
                />
              ) : (
                <EmptyState
                  icon={<Database />}
                  title="No datasets match"
                  description="Try another search or clear the filter."
                />
              )
            }
          />
        </Panel>

        {/* Right: Clean Interactive Dataset Inspector */}
        <Panel className="xl:col-span-5">
          {selected ? (
            <>
              <div className="border-b border-border/80 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-surface-sunken text-foreground/80 shadow-2xs">
                      <FileSpreadsheet className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="eyebrow text-muted-foreground">Dataset details</p>
                      <h3 className="truncate text-lg font-bold tracking-tight text-foreground">
                        {selected.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {selected.source} · {selected.updatedAt}
                      </p>
                    </div>
                  </div>
                  {onDeleteDataset && (
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      onClick={() => onDeleteDataset(selected.id)}
                      aria-label={`Delete ${selected.name}`}
                    >
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  )}
                </div>
              </div>

              <PanelBody className="space-y-4">
                {/* Status Indicator */}
                <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-sunken/60 px-3.5 py-2 border border-border/60">
                  <span className="text-xs font-medium text-muted-foreground">Current status</span>
                  <DatasetStatusBadge status={selected.status} />
                </div>

                {/* 4 Clean Monochrome KPI Metric Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-border/80 bg-surface-sunken/40 p-3">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-medium uppercase tracking-wider">Rows</span>
                      <Rows3 className="size-4" />
                    </div>
                    <p className="mt-1 font-mono text-xl font-bold text-foreground">
                      {selected.rows ? formatNumber(selected.rows) : "0"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Order rows loaded</p>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-surface-sunken/40 p-3">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-medium uppercase tracking-wider">Columns</span>
                      <Columns3 className="size-4" />
                    </div>
                    <p className="mt-1 font-mono text-xl font-bold text-foreground">
                      {selected.columns || "0"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Detected fields</p>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-surface-sunken/40 p-3">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-medium uppercase tracking-wider">Format</span>
                      <FileSpreadsheet className="size-4" />
                    </div>
                    <p className="mt-1 font-mono text-lg font-bold text-foreground">
                      {selected.source}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Delimited file</p>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-surface-sunken/40 p-3">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-medium uppercase tracking-wider">Added</span>
                      <Calendar className="size-4" />
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                      {selected.updatedAt}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Upload timestamp</p>
                  </div>
                </div>

                {/* Status Action Card */}
                {selected.status === "needs-review" ? (
                  <div className="rounded-xl border border-border/80 bg-surface-sunken/40 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Sparkles className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground">Import Confirmation Required</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                          This dataset is staged and awaiting confirmation. Review the detected columns and confirm the schema to activate telemetry.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="primary"
                        className="flex-1 justify-center shadow-sm"
                        onClick={() => (onConfirmDataset ? onConfirmDataset(selected.id) : onOpenDataset?.(selected.id))}
                      >
                        <CheckCircle2 className="size-4" /> Confirm import
                      </Button>
                      {onOpenDataset && (
                        <Button
                          variant="secondary"
                          className="justify-center"
                          onClick={() => onOpenDataset(selected.id)}
                        >
                          <ExternalLink className="size-4" /> Inspect
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/80 bg-surface-sunken/30 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground">Active & Imported</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                          This dataset is confirmed and actively powering your telemetry, margins, and dashboards.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full justify-center"
                      onClick={() => onOpenDataset?.(selected.id)}
                    >
                      <ExternalLink className="size-4" /> Open dataset details & rows
                    </Button>
                  </div>
                )}
              </PanelBody>
            </>
          ) : (
            <EmptyState
              icon={<Database />}
              title={datasets.length ? "Select a dataset" : "Dataset details appear here"}
              description={
                datasets.length
                  ? "Choose a dataset to see its columns and quality checks."
                  : "Upload and confirm a dataset to review its columns and data quality."
              }
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
