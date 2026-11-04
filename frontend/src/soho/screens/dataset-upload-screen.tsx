import { ArrowLeft, Check, CheckCircle2, CircleAlert, CloudUpload, FileSpreadsheet, PartyPopper, X, XCircle } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "../../lib/utils";
import { Badge } from "../components/badge";
import { Button, buttonVariants } from "../components/button";
import { Select } from "../components/form";
import { PageHeader } from "../components/misc";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../components/panel";
import { EmptyState, InlineAlert } from "../components/states";
import { formatNumber } from "../lib/format";
import { AppLink } from "../router-adapter";
import type { QualityCheck } from "../types";

export interface DatasetUploadScreenProps {
  preview: {
    fileName: string;
    fileSize: string;
    rows: number;
    headers: string[];
    detected: readonly string[];
    mapping: string[];
    targetFields: string[];
    rows_: string[][];
  };
  checks: QualityCheck[];
  /** Called with the chosen File. Wire to your upload endpoint. */
  onFileSelected?: (file: File) => void;
  onImport?: () => void;
}

const steps = ["Upload file", "Map columns", "Review quality", "Import"];

export function DatasetUploadScreen({ preview, checks, onFileSelected, onImport }: DatasetUploadScreenProps) {
  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(file?: File) {
    if (file) onFileSelected?.(file);
    setStep(1);
  }

  const counts = {
    pass: checks.filter((c) => c.result === "pass").length,
    warn: checks.filter((c) => c.result === "warn").length,
    fail: checks.filter((c) => c.result === "fail").length,
  };

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <AppLink to="/datasets" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Datasets
        </AppLink>
        <PageHeader title="Upload a dataset" description="CSV, Excel or Google Sheets exports. We'll check the data before anything is imported." />
      </div>

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3" aria-label="Upload progress">
        {steps.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s} className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
              <span
                className={cn(
                  "num inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  done && "bg-primary text-primary-foreground",
                  current && "bg-primary-soft text-primary ring-2 ring-primary",
                  !done && !current && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("text-sm font-medium", current || done ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              {i < steps.length - 1 && <span aria-hidden className={cn("mx-2 hidden h-px w-10 sm:block", done ? "bg-primary" : "bg-border")} />}
            </li>
          );
        })}
      </ol>

      {step === 0 && (
        <Panel>
          <PanelBody className="pt-5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files[0]);
              }}
              className={cn(
                "flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors",
                dragging ? "border-primary bg-primary-soft/50" : "border-border-strong bg-surface-sunken/40",
              )}
            >
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-surface text-primary shadow-lift">
                <CloudUpload className="size-6" />
              </span>
              <p className="mt-4 text-base font-semibold text-foreground">Drop your file here</p>
              <p className="mt-1 text-sm text-muted-foreground">.csv, .xlsx or .xls · up to 50 MB</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="primary" onClick={() => inputRef.current?.click()}>
                  Choose file
                </Button>
                <Button onClick={() => setStep(1)}>Use sample file</Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                onChange={(e) => pick(e.target.files?.[0])}
              />
            </div>
          </PanelBody>
        </Panel>
      )}

      {step > 0 && step < 3 && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 pr-4 shadow-soft">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-success-soft text-success">
            <FileSpreadsheet className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{preview.fileName}</p>
            <p className="num text-xs text-muted-foreground">
              {preview.fileSize} · {formatNumber(preview.rows)} rows · {preview.headers.length} columns
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Remove file" onClick={() => setStep(0)}>
            <X />
          </Button>
        </div>
      )}

      {step === 1 && (
        <Panel>
          <PanelHeader title="Map columns" description="Match each column in your file to a Soho Suite field. We've made our best guess." />
          <div className="scrollbar-thin overflow-x-auto border-t border-border">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Column mapping and data preview</caption>
              <thead>
                <tr className="bg-surface-sunken/60">
                  {preview.headers.map((h, i) => (
                    <th key={h} scope="col" className="space-y-2 px-4 py-3 text-left align-top font-normal first:pl-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{h}</span>
                        <Badge tone="neutral" className="text-[0.65rem] uppercase">
                          {preview.detected[i]}
                        </Badge>
                      </div>
                      <Select size_="sm" aria-label={`Map ${h} to field`} defaultValue={preview.mapping[i]}>
                        {preview.targetFields.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </Select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows_.map((r, ri) => (
                  <tr key={ri} className="border-t border-border">
                    {r.map((cell, ci) => {
                      const bad = cell === "" || cell.startsWith("-") || (ci === 5 && cell.includes("/"));
                      return (
                        <td key={ci} className={cn("num px-4 py-2.5 first:pl-5", bad ? "bg-warning-soft/70 text-warning-foreground" : "text-foreground/85")}>
                          {cell || <span className="italic opacity-70">empty</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PanelFooter>
            <span>Showing first {preview.rows_.length} of {formatNumber(preview.rows)} rows · highlighted cells will be checked</span>
            <Button variant="primary" onClick={() => setStep(2)}>
              Continue
            </Button>
          </PanelFooter>
        </Panel>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Panel className="lg:col-span-4">
            <PanelHeader title="Quality summary" />
            <PanelBody className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-success-soft p-3">
                  <p className="num text-2xl font-semibold text-success">{counts.pass}</p>
                  <p className="text-xs text-success">Passed</p>
                </div>
                <div className="rounded-xl bg-warning-soft p-3">
                  <p className="num text-2xl font-semibold text-warning-foreground">{counts.warn}</p>
                  <p className="text-xs text-warning-foreground">Warnings</p>
                </div>
                <div className="rounded-xl bg-destructive-soft p-3">
                  <p className="num text-2xl font-semibold text-destructive">{counts.fail}</p>
                  <p className="text-xs text-destructive">Blocking</p>
                </div>
              </div>
              <InlineAlert tone="danger" title="1 issue blocks import">
                Exclude the 3 affected rows or fix them in your file and re-upload.
              </InlineAlert>
            </PanelBody>
          </Panel>
          <Panel className="lg:col-span-8">
            <PanelHeader title="Checks" description="Run against all rows in your file" />
            <ul className="divide-y divide-border border-t border-border">
              {checks.map((c) => {
                const Icon = c.result === "pass" ? CheckCircle2 : c.result === "warn" ? CircleAlert : XCircle;
                return (
                  <li key={c.id} className="flex items-start gap-3 px-5 py-3.5">
                    <Icon
                      className={cn(
                        "mt-0.5 size-5 shrink-0",
                        c.result === "pass" && "text-success",
                        c.result === "warn" && "text-warning",
                        c.result === "fail" && "text-destructive",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{c.label}</p>
                      <p className="text-sm text-muted-foreground">{c.detail}</p>
                    </div>
                    {c.result === "fail" && <Button size="sm">Exclude rows</Button>}
                    {c.affectedRows !== undefined && c.result === "warn" && (
                      <span className="num shrink-0 text-xs text-muted-foreground">{c.affectedRows} rows</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <PanelFooter>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back to mapping
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onImport?.();
                  setStep(3);
                }}
              >
                Import {formatNumber(preview.rows - 3)} rows
              </Button>
            </PanelFooter>
          </Panel>
        </div>
      )}

      {step === 3 && (
        <Panel>
          <EmptyState
            icon={<PartyPopper />}
            title="Import started"
            description={`${preview.fileName} is being processed. Your dashboards will refresh automatically when it's ready — usually within a minute.`}
            action={
              <>
                <AppLink to="/datasets" className={buttonVariants({ variant: "primary" })}>
                  Go to datasets
                </AppLink>
                <Button onClick={() => setStep(0)}>Upload another</Button>
              </>
            }
          />
        </Panel>
      )}
    </div>
  );
}
