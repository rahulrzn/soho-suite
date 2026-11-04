import { CalendarClock, Download, FileBarChart2, Mail, MoreHorizontal, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";

import { cn } from "../../lib/utils";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { DataTable, type Column } from "../components/data-table";
import { PageHeader, Segmented } from "../components/misc";
import { Panel, PanelBody, PanelHeader } from "../components/panel";
import { ReportStatusBadge } from "../components/status";
import { formatCurrency } from "../lib/format";
import type { ReportItem, ReportTemplate, ScheduledReport } from "../types";

export interface ReportsScreenProps {
  templates: ReportTemplate[];
  reports: ReportItem[];
  scheduled: ScheduledReport[];
  preview: { title: string; period: string; lines: { label: string; value: number; emphasis?: boolean }[]; bars: number[] };
  onGenerate?: (templateId: string) => void;
  onDownload?: (reportId: string) => void;
}

/** Tiny abstract thumbnails so templates are recognisable at a glance. */
function TemplateVisual({ kind }: { kind: ReportTemplate["visual"] }) {
  return (
    <svg viewBox="0 0 80 48" className="h-12 w-20" aria-hidden>
      {kind === "bars" &&
        [14, 22, 18, 30, 26, 36].map((h, i) => <rect key={i} x={6 + i * 12} y={44 - h} width="8" height={h} rx="2" fill="var(--chart-1)" opacity={0.35 + i * 0.12} />)}
      {kind === "line" && (
        <>
          <path d="M4 38 L18 30 L30 33 L44 20 L58 23 L76 8" fill="none" stroke="var(--chart-3)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M4 38 L18 30 L30 33 L44 20 L58 23 L76 8 L76 46 L4 46Z" fill="var(--chart-3)" opacity="0.15" />
        </>
      )}
      {kind === "donut" && (
        <>
          <circle cx="40" cy="24" r="16" fill="none" stroke="var(--muted)" strokeWidth="8" />
          <circle cx="40" cy="24" r="16" fill="none" stroke="var(--chart-2)" strokeWidth="8" strokeDasharray="60 101" transform="rotate(-90 40 24)" />
          <circle cx="40" cy="24" r="16" fill="none" stroke="var(--chart-1)" strokeWidth="8" strokeDasharray="25 101" strokeDashoffset="-60" transform="rotate(-90 40 24)" />
        </>
      )}
      {kind === "table" &&
        [0, 1, 2, 3].map((r) => (
          <g key={r}>
            <rect x="6" y={6 + r * 10} width="34" height="5" rx="2" fill="var(--border-strong)" />
            <rect x={56 - r * 4} y={6 + r * 10} width={18 + r * 4} height="5" rx="2" fill="var(--chart-4)" opacity="0.6" />
          </g>
        ))}
    </svg>
  );
}

export function ReportsScreen({ templates, reports, scheduled, preview, onGenerate, onDownload }: ReportsScreenProps) {
  const [type, setType] = useState<"all" | ReportItem["type"]>("all");
  const rows = reports.filter((r) => type === "all" || r.type === type);
  const maxBar = Math.max(...preview.bars);

  const cols: Column<ReportItem>[] = [
    {
      key: "title",
      header: "Report",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="num inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-sunken text-[0.6rem] font-semibold text-muted-foreground">
            {r.format}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{r.title}</p>
            <p className="text-xs text-muted-foreground">
              {r.period} · {r.author}
            </p>
          </div>
        </div>
      ),
    },
    { key: "type", header: "Type", hideBelow: "lg", cell: (r) => <Badge>{r.type}</Badge> },
    { key: "generated", header: "Generated", hideBelow: "md", cell: (r) => <span className="text-muted-foreground">{r.generatedAt}</span> },
    { key: "status", header: "Status", hideBelow: "sm", cell: (r) => <ReportStatusBadge status={r.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (r) =>
        r.status === "ready" ? (
          <Button size="sm" variant="ghost" onClick={() => onDownload?.(r.id)} aria-label={`Download ${r.title}`}>
            <Download /> <span className="hidden sm:inline">{r.size}</span>
          </Button>
        ) : r.status === "failed" ? (
          <Button size="sm" variant="ghost" aria-label={`Retry ${r.title}`}>
            <RefreshCw /> Retry
          </Button>
        ) : (
          <RefreshCw className="ml-auto size-4 animate-spin text-info" aria-label="Generating" />
        ),
    },
  ];

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow="Data"
        title="Reports"
        description="Generate shareable reports from your data, or schedule them to land in your inbox."
        actions={
          <Button variant="primary">
            <Plus /> New report
          </Button>
        }
      />

      <section aria-labelledby="templates-h">
        <h2 id="templates-h" className="eyebrow mb-3">
          Start from a template
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onGenerate?.(t.id)}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
            >
              <span className="rounded-xl bg-surface-sunken p-2">
                <TemplateVisual kind={t.visual} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground group-hover:text-primary">{t.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <Panel>
            <PanelHeader
              title="Generated reports"
              actions={
                <Segmented
                  label="Report type"
                  size="sm"
                  value={type}
                  onChange={setType}
                  options={[
                    { value: "all", label: "All" },
                    { value: "Financial", label: "Financial" },
                    { value: "Operations", label: "Ops" },
                    { value: "Inventory", label: "Inventory" },
                  ]}
                />
              }
            />
            <DataTable caption="Generated reports" rows={rows} columns={cols} getRowId={(r) => r.id} />
          </Panel>

          <Panel>
            <PanelHeader title="Scheduled" description="Delivered automatically by email" actions={<Button size="sm"><CalendarClock /> Schedule</Button>} />
            <ul className="divide-y divide-border border-t border-border">
              {scheduled.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-foreground">
                    <Mail className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.cadence}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-xs text-muted-foreground">Next run</p>
                    <p className="text-sm font-medium text-foreground">{s.nextRun}</p>
                  </div>
                  <span className="num hidden text-xs text-muted-foreground md:block">{s.recipients} recipients</span>
                  <Button variant="ghost" size="icon-sm" aria-label={`More options for ${s.title}`}>
                    <MoreHorizontal />
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Document preview */}
        <Panel className="xl:col-span-4">
          <PanelHeader title="Preview" description="Latest profit & loss" actions={<Button size="sm" variant="ghost" aria-label="Open preview"><FileBarChart2 /></Button>} />
          <PanelBody>
            <div className="rounded-xl border border-border bg-surface p-5 shadow-lift">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <p className="font-display text-base font-semibold text-foreground">{preview.title}</p>
                  <p className="text-xs text-muted-foreground">{preview.period}</p>
                </div>
                <span className="size-6 rounded-md bg-accent" aria-hidden />
              </div>
              <div className="mt-4 flex h-20 items-end gap-1.5" aria-hidden>
                {preview.bars.map((b, i) => (
                  <div
                    key={i}
                    className={cn("flex-1 rounded-t-sm", i === preview.bars.length - 1 ? "bg-primary" : "bg-primary/25")}
                    style={{ height: `${(b / maxBar) * 100}%` }}
                  />
                ))}
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                {preview.lines.map((l) => (
                  <div
                    key={l.label}
                    className={cn("flex justify-between gap-3", l.emphasis && "border-t border-border pt-2 font-semibold text-foreground")}
                  >
                    <dt className={l.emphasis ? "" : "text-muted-foreground"}>{l.label}</dt>
                    <dd className={cn("num", l.value < 0 && "text-muted-foreground")}>
                      {l.value < 0 ? `(${formatCurrency(Math.abs(l.value))})` : formatCurrency(l.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <Button variant="primary" className="mt-4 w-full">
              <Download /> Download PDF
            </Button>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
