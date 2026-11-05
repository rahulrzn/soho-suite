/* eslint-disable react-hooks/set-state-in-effect -- Effects refresh business members and owner-only invitation data. */
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { addMember, removeMember, updateMemberRole } from '../api/businessApi'
import { formatApiError } from '../api/formatError'
import { createInvitation, listInvitations, requestOwnershipTransfer, resendInvitation, revokeInvitation, revokeOwnershipTransfer } from '../api/collaborationApi'
import type { BusinessMember, BusinessRole, Invitation } from '../api/models'
import { useWorkspace } from '../app/WorkspaceContext'
import { PageHeader } from '../soho/components/misc'
import { ConfirmDialog, Modal } from '../components/Modal'
import { EmptyState, LoadingLine, Message } from '../components/Feedback'
import { cn } from '../lib/utils'
import type { PageCallbacks } from './types'

type CollaborationLink = { type: 'invitation' | 'transfer'; token: string; path: string; id: number; recipient: string }

export function TeamPage({ onError, onNotice }: PageCallbacks) {
  const { business, role, members, refreshMembers } = useWorkspace()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationLoading, setInvitationLoading] = useState(false)
  const [modal, setModal] = useState<'invite' | 'add-member' | 'transfer' | null>(null)
  const [link, setLink] = useState<CollaborationLink | null>(null)
  const [removeTarget, setRemoveTarget] = useState<BusinessMember | null>(null)
  const [transferToRevoke, setTransferToRevoke] = useState<number | null>(null)
  const [pendingTransferId, setPendingTransferId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const isOwner = role === 'OWNER'
  const pendingInvitations = invitations.filter((invitation) => invitation.status.toUpperCase() === 'PENDING')

  const loadInvitations = useCallback(async () => {
    if (!isOwner) { setInvitations([]); return }
    setInvitationLoading(true)
    try { setInvitations(await listInvitations(business.id)) }
    catch (error) { onError(messageOf(error)) }
    finally { setInvitationLoading(false) }
  }, [business.id, isOwner, onError])
  useEffect(() => { void refreshMembers() }, [refreshMembers])
  useEffect(() => { void loadInvitations() }, [loadInvitations])

  async function makeInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim()
    const inviteRole = String(form.get('role')) as 'MANAGER' | 'VIEWER'
    setBusy(true); onError('')
    try {
      const created = await createInvitation(business.id, email, inviteRole)
      setModal(null)
      if (created.token) setLink({ type: 'invitation', token: created.token, path: '/accept-invitation', id: created.id, recipient: created.email })
      await loadInvitations()
      onNotice('Invitation created. Copy the one-time acceptance link and share it with the invited person; Soho Suite does not email it.')
    } catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function rotate(invitation: Invitation) {
    setBusy(true); onError('')
    try {
      const updated = await resendInvitation(business.id, invitation.id)
      if (updated.token) setLink({ type: 'invitation', token: updated.token, path: '/accept-invitation', id: updated.id, recipient: updated.email })
      await loadInvitations()
      onNotice('A new one-time invitation link was created. The earlier token was rotated.')
    } catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function revoke(invitation: Invitation) {
    setBusy(true)
    try { await revokeInvitation(business.id, invitation.id); onNotice('Invitation revoked.'); await loadInvitations() }
    catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function addExisting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await addMember(business.id, Number(form.get('userId')), String(form.get('role')) as BusinessRole)
      setModal(null); onNotice('Existing user added to the business.'); await refreshMembers()
    } catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function saveRole(member: BusinessMember, nextRole: BusinessRole) {
    if (nextRole === member.role) return
    setBusy(true)
    try { await updateMemberRole(business.id, member.userId, nextRole); onNotice('Member role updated.'); await refreshMembers() }
    catch (error) { onError(messageOf(error)); await refreshMembers() }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!removeTarget) return
    setBusy(true)
    try { await removeMember(business.id, removeTarget.userId); onNotice('Member removed from the business.'); setRemoveTarget(null); await refreshMembers() }
    catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function transfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const managerId = Number(form.get('newOwnerUserId'))
    setBusy(true)
    try {
      const result = await requestOwnershipTransfer(business.id, managerId)
      setPendingTransferId(result.id)
      setModal(null)
      if (result.token) setLink({ type: 'transfer', token: result.token, path: '/accept-ownership-transfer', id: result.id, recipient: memberName(members.find((item) => item.userId === managerId)) })
      onNotice('Transfer request created. Share the one-time acceptance link with the manager; they must accept within seven days.')
    } catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function revokeTransfer() {
    if (transferToRevoke === null) return
    setBusy(true)
    try { await revokeOwnershipTransfer(business.id, transferToRevoke); setTransferToRevoke(null); setPendingTransferId(null); onNotice('Ownership transfer revoked.') }
    catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function copyLink() {
    if (!link) return
    const url = new URL(link.path, window.location.origin)
    url.searchParams.set('token', link.token)
    try { await navigator.clipboard.writeText(url.toString()); setCopied('link') }
    catch { setCopied(null) }
  }
  async function copyCode() {
    if (!link) return
    try { await navigator.clipboard.writeText(link.token); setCopied('code') }
    catch { setCopied(null) }
  }

  return <div className="feature-stack">
    <PageHeader
      eyebrow="Workspace · Team"
      title="Team and access"
      description="Manage business members, assign operational roles, and coordinate workspace invitations."
      actions={isOwner && (
        <div className="inline-actions">
          <button className="button-secondary" onClick={() => setModal('add-member')}>Add by Profile ID</button>
          <button className="button-primary" onClick={() => setModal('invite')}>Invite by email <span aria-hidden="true">+</span></button>
        </div>
      )}
    />
    {!isOwner && (
      <Message variant="warning" text={'Team membership changes can only be made by the business owner. Your current role is ' + (role || 'member') + '.'} />
    )}
    <section className="content-panel panel-pad">
      <div className="panel-heading">
        <div>
          <p className="section-label">Business members</p>
          <h2>People in this workspace</h2>
          <p>{members.length} active member{members.length === 1 ? '' : 's'}</p>
        </div>
        <span className="role-chip">{role || 'Member'}</span>
      </div>
      {members.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Username</th>
                <th>Role</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="hover:bg-surface-sunken/50 transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-xs">
                        {((member.firstName?.charAt(0) ?? '') + (member.lastName?.charAt(0) ?? '')).toUpperCase() || 'U'}
                      </span>
                      <strong className="text-sm font-semibold text-foreground">{memberName(member)}</strong>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-muted-foreground">{member.username ? '@' + member.username : '—'}</td>
                  <td>
                    {isOwner && member.role !== 'OWNER' ? (
                      <select
                        className="rounded-md border border-input bg-surface px-2.5 py-1 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={'Role for ' + memberName(member)}
                        value={member.role}
                        disabled={busy}
                        onChange={(event) => void saveRole(member, event.target.value as BusinessRole)}
                      >
                        <option value="MANAGER">Manager</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    ) : (
                      <span className={cn("status-tag", member.role === 'OWNER' ? "status-tag" : "status-tag status-muted")}>
                        {member.role}
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    {isOwner && member.role !== 'OWNER' && (
                      <button className="button-quiet button-small text-destructive hover:bg-destructive-soft font-semibold" onClick={() => setRemoveTarget(member)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No member details returned" description="The backend did not return membership entries for this workspace." />
      )}
    </section>

    {isOwner && (
      <section className="content-panel panel-pad">
        <div className="panel-heading">
          <div>
            <p className="section-label">Invitations</p>
            <h2>Pending invitations</h2>
            <p>One-time invitations are generated here and shared manually with recipients.</p>
          </div>
          <button className="button-secondary button-small" onClick={() => void loadInvitations()} disabled={invitationLoading}>
            Refresh
          </button>
        </div>
        {invitationLoading ? (
          <LoadingLine text="Loading invitations…" />
        ) : pendingInvitations.length ? (
          <div className="invitation-list divide-y divide-border">
            {pendingInvitations.map((invitation) => (
              <article className="invitation-row flex items-center justify-between py-3.5" key={invitation.id}>
                <div>
                  <strong className="block text-sm font-semibold text-foreground">{invitation.email}</strong>
                  <span className="text-xs text-muted-foreground">{invitation.role} · Pending acceptance</span>
                  <small className="block text-[0.7rem] text-muted-foreground mt-0.5">Expires {new Date(invitation.expiresAt).toLocaleString()}</small>
                </div>
                <div className="inline-actions">
                  <button className="button-secondary button-small" disabled={busy} onClick={() => void rotate(invitation)}>Resend link</button>
                  <button className="button-quiet button-small text-destructive hover:bg-destructive-soft" disabled={busy} onClick={() => void revoke(invitation)}>Revoke</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No pending invitations" description="Create a new invitation to add team members to this business workspace." />
        )}
      </section>
    )}

    {isOwner && (
      <section className="content-panel panel-pad transfer-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="section-label">OWNERSHIP</p>
          <h2>Transfer business ownership</h2>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">
            Transfer full business owner rights to an active manager. After acceptance, you will become a manager.
          </p>
          {pendingTransferId !== null && <p className="text-xs text-primary font-medium mt-1">Transfer request #{pendingTransferId} was created in this session.</p>}
        </div>
        <div className="inline-actions shrink-0">
          <button className="button-secondary" disabled={!members.some((member) => member.role === 'MANAGER')} onClick={() => setModal('transfer')}>
            Request transfer
          </button>
          {pendingTransferId !== null && (
            <button className="button-quiet text-destructive" onClick={() => setTransferToRevoke(pendingTransferId)}>Revoke request</button>
          )}
        </div>
      </section>
    )}
    {modal === 'invite' && <Modal title="Invite someone to the business" description="The invitation is limited to one email address and expires after seven days." onClose={() => setModal(null)}><form className="field-stack" onSubmit={(event) => void makeInvitation(event)}><label>Email address<input type="email" name="email" maxLength={255} required /></label><label>Business role<select name="role" defaultValue="VIEWER"><option value="VIEWER">Viewer · can read</option><option value="MANAGER">Manager · can manage business data</option></select></label><p className="quiet-text">After creation, copy the one-time link and share it with the intended person. The invitation is not emailed automatically.</p><div className="modal-actions"><button className="button-secondary" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? 'Creating…' : 'Create invitation'}</button></div></form></Modal>}
    {modal === 'add-member' && <Modal title="Add an existing user" description="Ask them to copy their Profile ID from Profile settings. Email lookup is not available." onClose={() => setModal(null)}><form className="field-stack" onSubmit={(event) => void addExisting(event)}><label>User profile ID<input type="number" name="userId" min="1" step="1" required /></label><label>Role<select name="role" defaultValue="VIEWER"><option value="VIEWER">Viewer</option><option value="MANAGER">Manager</option></select></label><div className="modal-actions"><button className="button-secondary" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? 'Adding…' : 'Add member'}</button></div></form></Modal>}
    {modal === 'transfer' && <Modal title="Request ownership transfer" description="Choose a current business manager. They must accept the one-time token within seven days." onClose={() => setModal(null)}><form className="field-stack" onSubmit={(event) => void transfer(event)}><label>New owner<select name="newOwnerUserId" required defaultValue=""><option value="" disabled>Choose a manager</option>{members.filter((member) => member.role === 'MANAGER').map((member) => <option key={member.userId} value={member.userId}>{memberName(member)}</option>)}</select></label><p className="quiet-text">This creates an acceptance link; it does not email the recipient. Ownership changes only after the selected manager accepts.</p><div className="modal-actions"><button className="button-secondary" type="button" onClick={() => setModal(null)}>Cancel</button><button className="button-primary" disabled={busy}>{busy ? 'Creating request…' : 'Create transfer request'}</button></div></form></Modal>}
    {link && <Modal title={link.type === 'invitation' ? 'Invitation created' : 'Transfer request created'} description={'Share a one-time link or code with ' + link.recipient + '. Keep it private; possession grants the ability to accept.'} onClose={() => { setLink(null); setCopied(null) }}><div className="field-stack"><label>Acceptance link<input readOnly value={buildLink(link)} onFocus={(event) => event.currentTarget.select()} /></label><button className="button-secondary" onClick={() => void copyLink()}>{copied === 'link' ? 'Link copied' : 'Copy link'}</button><label>{link.type === 'invitation' ? 'Invitation code' : 'Transfer code'}<input readOnly value={link.token} onFocus={(event) => event.currentTarget.select()} /></label><button className="button-secondary" onClick={() => void copyCode()}>{copied === 'code' ? 'Code copied' : 'Copy code'}</button><p className="quiet-text">The recipient can open the link or enter the code on the acceptance page. Soho Suite does not email invitations.</p>{link.type === 'transfer' && <button className="button-quiet" onClick={() => { setTransferToRevoke(link.id); setLink(null) }}>Revoke this request</button>}</div></Modal>}
    {removeTarget && <ConfirmDialog title={'Remove ' + memberName(removeTarget) + '?'} description="This removes their membership in this business. The backend will reject the request if the target is the owner." confirmLabel="Remove member" destructive busy={busy} onCancel={() => setRemoveTarget(null)} onConfirm={() => void remove()} />}
    {transferToRevoke !== null && <ConfirmDialog title="Revoke this ownership transfer?" description="The recipient will no longer be able to accept this transfer." confirmLabel="Revoke transfer" destructive busy={busy} onCancel={() => setTransferToRevoke(null)} onConfirm={() => void revokeTransfer()} />}
  </div>
}

function memberName(member?: BusinessMember) { return member ? (member.firstName + ' ' + member.lastName).trim() || member.username || 'Business member' : 'Business member' }
function buildLink(link: CollaborationLink) { const url = new URL(link.path, window.location.origin); url.searchParams.set('token', link.token); return url.toString() }
function messageOf(error: unknown) { return formatApiError(error) }
