import { Check, Clock, MoreHorizontal, Send, ShieldCheck, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { DataTable, type Column } from "../components/data-table";
import { Field, Input, Select } from "../components/form";
import { Avatar, PageHeader } from "../components/misc";
import { Panel, PanelBody, PanelHeader } from "../components/panel";
import type { Invitation, Permission, Role, TeamMember } from "../types";

export interface TeamScreenProps {
  members: TeamMember[];
  invitations: Invitation[];
  permissions: Permission[];
  seatsUsed: number;
  seatsTotal: number;
  onInvite?: (email: string, role: Role) => void;
  onResend?: (id: string) => void;
  onRevoke?: (id: string) => void;
}

const roles: Role[] = ["Owner", "Admin", "Manager", "Analyst", "Viewer"];

export function TeamScreen({ members, invitations, permissions, seatsUsed, seatsTotal, onInvite, onResend, onRevoke }: TeamScreenProps) {
  const cols: Column<TeamMember>[] = [
    {
      key: "name",
      header: "Member",
      sortValue: (m) => m.name,
      cell: (m) => (
        <div className="flex items-center gap-3">
          <Avatar initials={m.initials} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium text-foreground">
              {m.name}
              {m.status === "suspended" && <Badge tone="danger">Suspended</Badge>}
            </p>
            <p className="truncate text-xs text-muted-foreground">{m.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (m) => roles.indexOf(m.role),
      width: "160px",
      cell: (m) =>
        m.role === "Owner" ? (
          <Badge tone="accent">
            <ShieldCheck className="size-3" /> Owner
          </Badge>
        ) : (
          <Select size_="sm" aria-label={`Role for ${m.name}`} defaultValue={m.role} className="w-32">
            {roles.slice(1).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        ),
    },
    {
      key: "active",
      header: "Last active",
      hideBelow: "md",
      cell: (m) => (
        <span className={cn("flex items-center gap-1.5", m.lastActive === "Now" ? "text-success" : "text-muted-foreground")}>
          {m.lastActive === "Now" && <span className="size-1.5 rounded-full bg-success" />}
          {m.lastActive}
        </span>
      ),
    },
    {
      key: "menu",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (m) => (
        <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${m.name}`} disabled={m.role === "Owner"}>
          <MoreHorizontal />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow="Workspace"
        title="Team"
        description="Invite people and control what they can see and change."
        actions={
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-1.5 shadow-soft">
            <span className="text-sm text-muted-foreground">Seats</span>
            <div className="h-1.5 w-20 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(seatsUsed / seatsTotal) * 100}%` }} />
            </div>
            <span className="num text-sm font-medium text-foreground">
              {seatsUsed}/{seatsTotal}
            </span>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-8">
          <PanelHeader title="Members" description={`${members.length} people in this workspace`} />
          <DataTable caption="Team members" rows={members} columns={cols} getRowId={(m) => m.id} />
        </Panel>

        <div className="space-y-6 xl:col-span-4">
          <Panel>
            <PanelHeader
              title={
                <span className="flex items-center gap-2">
                  <UserPlus className="size-4 text-primary" /> Invite someone
                </span>
              }
            />
            <PanelBody>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  onInvite?.(String(fd.get("email")), fd.get("role") as Role);
                  e.currentTarget.reset();
                }}
              >
                <Field label="Email" htmlFor="invite-email">
                  <Input id="invite-email" name="email" type="email" placeholder="name@company.com" required />
                </Field>
                <Field label="Role" htmlFor="invite-role" hint="Managers can record expenses and adjust stock.">
                  <Select id="invite-role" name="role" defaultValue="Manager">
                    {roles.slice(1).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit" variant="primary" className="w-full">
                  <Send /> Send invitation
                </Button>
              </form>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Pending invitations" description={`${invitations.length} awaiting response`} />
            <ul className="divide-y divide-border border-t border-border">
              {invitations.map((inv) => (
                <li key={inv.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.role} · sent {inv.sentAt} by {inv.invitedBy}
                      </p>
                    </div>
                    <Badge tone={inv.expiresIn.startsWith("1 ") ? "warning" : "neutral"}>
                      <Clock className="size-3" /> {inv.expiresIn}
                    </Badge>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onResend?.(inv.id)}>
                      Resend
                    </Button>
                    <Button size="sm" variant="danger-ghost" onClick={() => onRevoke?.(inv.id)}>
                      Revoke
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHeader title="Roles & permissions" description="What each role can do in Soho Suite" />
        <div className="scrollbar-thin overflow-x-auto border-t border-border">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Permissions by role</caption>
            <thead>
              <tr className="bg-surface-sunken/60">
                <th scope="col" className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  Capability
                </th>
                {roles.map((r) => (
                  <th key={r} scope="col" className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.capability} className="border-t border-border">
                  <th scope="row" className="px-5 py-3 text-left font-normal text-foreground">
                    {p.capability}
                  </th>
                  {roles.map((r) => (
                    <td key={r} className="px-3 py-3 text-center">
                      {p.roles.includes(r) ? (
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-success-soft text-success">
                          <Check className="size-3.5" aria-label="Allowed" />
                        </span>
                      ) : (
                        <span className="text-border-strong" aria-label="Not allowed">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
