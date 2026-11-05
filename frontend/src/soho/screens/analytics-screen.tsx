import type { ReactNode } from "react";
import { Download, TrendingUp } from "lucide-react";

import { Button } from "../components/button";
import { PageHeader } from "../components/misc";
import { Panel, PanelBody, PanelHeader } from "../components/panel";
import { EmptyState } from "../components/states";
import { MetricStatus, TrendChart } from "../../features/OverviewPage";
import { LoadingLine } from "../../components/Feedback";
import { isAnalyticsReasonShared } from "../../features/analyticsPresentation";

export interface AnalyticsScreenProps {
  businessName: string;
  dateLabel: string;
  currency: string | null;
  metrics: { id: string; label: string; value: string | null; status: string; reason: string | null }[];
  dailyTrend: { status: string; value: { date: string; salesAmount: number }[] | null; reason: string | null };
  sharedDataReason: string | null;
  loading?: boolean;
  rangeControl: ReactNode;
  exportBusy: boolean;
  onExport: () => void;
}

export function AnalyticsScreen({
  businessName,
  dateLabel,
  currency,
  metrics,
  dailyTrend,
  sharedDataReason,
  loading = false,
  rangeControl,
  exportBusy,
  onExport,
}: AnalyticsScreenProps) {
  const header = (
    <PageHeader
      eyebrow="Analytics"
      title="Sales performance"
      description={`Mapped sales metrics and daily performance indicators from ${businessName}'s dataset.`}
      actions={
        <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-end">
          {rangeControl}
          <Button
            className="w-full sm:w-auto"
            variant="primary"
            disabled={exportBusy}
            onClick={onExport}
            aria-label="Export analytics CSV"
          >
            <Download className="size-4" />
            <span>{exportBusy ? "Preparing CSV…" : "Export CSV"}</span>
          </Button>
        </div>
      }
    />
  );

  return (
    <div className="space-y-6">
      {header}

      {loading ? (
        <section className="content-panel panel-pad" role="status">
          <LoadingLine text="Loading analytics for the selected date range…" />
        </section>
      ) : (
        <>
          {sharedDataReason && (
            <p className="rounded-lg border border-border bg-surface-sunken/60 px-4 py-3 text-xs text-muted-foreground" role="status">
              {sharedDataReason}
            </p>
          )}

          {/* Metrics Grid */}
          <section
            className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs"
            aria-label="Sales metrics"
          >
            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-4">
              {metrics.map((metric) => (
                <article
                  key={metric.id}
                  className="flex flex-col justify-between p-5 transition-colors hover:bg-surface-sunken/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                    {metric.status !== "AVAILABLE" && <MetricStatus status={metric.status} />}
                  </div>
                  <div className="mt-3">
                    <p className="num text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                      {metric.value ?? "—"}
                    </p>
                    {metric.reason && !isAnalyticsReasonShared(metric.reason, sharedDataReason) && (
                      <p className="mt-1 text-xs text-muted-foreground leading-normal">{metric.reason}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Daily Trend Chart Panel */}
          <Panel>
            <PanelHeader
              eyebrow="Trend Analysis"
              title="Daily imported sales"
              description={`${dateLabel}${currency ? ` · Currency: ${currency}` : ""}`}
              actions={dailyTrend.status !== "AVAILABLE" && <MetricStatus status={dailyTrend.status} />}
            />
            <PanelBody>
              {dailyTrend.status === "AVAILABLE" && dailyTrend.value?.length ? (
                <TrendChart values={dailyTrend.value} currency={currency} />
              ) : (
                <EmptyState
                  icon={<TrendingUp className="size-6 text-muted-foreground" />}
                  title="Daily sales trend unavailable"
                  description={
                    isAnalyticsReasonShared(dailyTrend.reason, sharedDataReason)
                      ? "See the data availability note above."
                      : dailyTrend.reason ?? "The backend returned no daily sales data for this date range."
                  }
                  className="py-10"
                />
              )}
            </PanelBody>
          </Panel>
        </>
      )}
    </div>
  );
}
