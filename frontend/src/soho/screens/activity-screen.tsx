import { Boxes, Database, FileText, History, Receipt, Settings, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "../../lib/utils";
import { Button } from "../components/button";
import { SearchInput, Select } from "../components/form";
import { Avatar, PageHeader } from "../components/misc";
import { Panel } from "../components/panel";
import { EmptyState } from "../components/states";
import type { ActivityEvent, ActivityModule } from "../types";

export interface ActivityScreenProps {
  events: ActivityEvent[];
}

const modules: ActivityModule[] = ["Datasets", "Expenses", "Inventory", "Reports", "Team", "Settings"];
const moduleMeta: Record<ActivityModule, { icon: typeof Database; cls: string }> = {
  Datasets: { icon: Database, cls: "bg-primary-soft text-primary" },
  Expenses: { icon: Receipt, cls: "bg-accent-soft text-accent-foreground" },
  Inventory: { icon: Boxes, cls: "bg-success-soft text-success" },
  Reports: { icon: FileText, cls: "bg-info-soft text-info" },
  Team: { icon: Users, cls: "bg-warning-soft text-warning-foreground" },
  Settings: { icon: Settings, cls: "bg-muted text-muted-foreground" },
};

export function ActivityScreen({ events }: ActivityScreenProps) {
  const [active, setActive] = useState<ActivityModule[]>([]);
  const [actor, setActor] = useState("all");
  const [q, setQ] = useState("");
  const actors = Array.from(new Set(events.map((e) => e.actor)));

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (active.length === 0 || active.includes(e.module)) &&
          (actor === "all" || e.actor === actor) &&
          `${e.action} ${e.target}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [events, active, actor, q],
  );
  const groups = filtered.reduce<Record<string, ActivityEvent[]>>((acc, e) => {
    (acc[e.day] ||= []).push(e);
    return acc;
  }, {});

  const toggle = (m: ActivityModule) => setActive((a) => (a.includes(m) ? a.filter((x) => x !== m) : [...a, m]));

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow="Workspace"
        title="Activity history"
        description="Changes recorded by this workspace. Filters search the events currently loaded from the backend."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by area">
          {modules.map((m) => {
            const on = active.includes(m);
            const Icon = moduleMeta[m].icon;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(m)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" /> {m}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Select size_="sm" aria-label="Person" value={actor} onChange={(e) => setActor(e.target.value)} className="w-40">
            <option value="all">Everyone</option>
            {actors.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
          <SearchInput placeholder="Search activity" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search activity" className="w-52" />
        </div>
      </div>

      <Panel>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<History />}
            title="No matching activity"
            description="Nothing happened that matches these filters."
            action={<Button onClick={() => { setActive([]); setActor("all"); setQ(""); }}>Clear filters</Button>}
          />
        ) : (
          Object.entries(groups).map(([day, items]) => (
            <section key={day} aria-labelledby={`day-${day}`} className="border-b border-border last:border-b-0">
              <h2 id={`day-${day}`} className="eyebrow sticky top-16 z-10 bg-surface/95 px-5 pt-4 pb-2 backdrop-blur">
                {day}
              </h2>
              <ol className="relative px-5 pb-3">
                <span aria-hidden className="absolute top-2 bottom-6 left-[2.35rem] w-px bg-border" />
                {items.map((e) => {
                  const meta = moduleMeta[e.module];
                  const Icon = meta.icon;
                  return (
                    <li key={e.id} className="relative flex gap-4 py-3">
                      <span className={cn("relative z-[1] inline-flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface", meta.cls)}>
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{e.actor}</span> <span className="text-muted-foreground">{e.action}</span>{" "}
                          <span className="font-medium">{e.target}</span>
                        </p>
                        {e.detail && <p className="mt-0.5 text-xs text-muted-foreground">{e.detail}</p>}
                      </div>
                      <div className="hidden shrink-0 items-center gap-2 sm:flex">
                        <Avatar initials={e.actorInitials} size="sm" />
                        <span className="num w-16 text-right text-xs text-muted-foreground">{e.time}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}
      </Panel>
    </div>
  );
}
