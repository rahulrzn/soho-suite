import { useState } from 'react'
import type { FormEvent } from 'react'
import { deleteBusiness, updateBusiness } from '../api/businessApi'
import { updateProfile, type UpdateProfile } from '../api/userApi'
import { formatApiError } from '../api/formatError'
import { useWorkspace } from '../app/WorkspaceContext'
import { RouteLink } from '../app/navigation'
import { Message } from '../components/Feedback'
import { ConfirmDialog } from '../components/Modal'
import { PageHeader } from '../soho/components/misc'
import type { PageCallbacks } from './types'

export function BusinessSettingsPage({ onError, onNotice }: PageCallbacks) {
  const { business, role, refreshWorkspace } = useWorkspace()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const editable = role === 'OWNER' || role === 'MANAGER'
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editable || busy) return
    const form = new FormData(event.currentTarget)
    const tradingName = String(form.get('tradingName')).trim()
    setBusy(true); onError('')
    try {
      await updateBusiness(business.id, {
        company: tradingName,
        tradingName,
        legalBusinessName: String(form.get('legalBusinessName')).trim() || undefined,
        businessType: String(form.get('businessType')) || undefined,
        legalStructure: String(form.get('legalStructure')) || undefined,
        industry: String(form.get('industry')).trim() || undefined,
        businessEmail: String(form.get('businessEmail')).trim() || undefined,
        businessCurrency: String(form.get('businessCurrency')).trim().toUpperCase(),
        financialYearStartMonth: Number(form.get('financialYearStartMonth')),
        country: String(form.get('country')).trim(),
        state: String(form.get('state')).trim(),
        city: String(form.get('city')).trim(),
        pincode: String(form.get('pincode')).trim(),
      })
      await refreshWorkspace()
      onNotice('Business settings saved.')
    } catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  async function removeBusiness() {
    if (role !== 'OWNER' || busy) return
    setBusy(true)
    onError('')
    try {
      await deleteBusiness(business.id)
      setConfirmDelete(false)
      onNotice('Business workspace deleted. Set up a workspace to continue.')
      await refreshWorkspace()
    } catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  return <div className="feature-stack">
    <PageHeader eyebrow="Workspace" title="Business settings" description="Update profile information, legal business structure, and default currency for this business." />
    <section className="content-panel panel-pad">
      <div className="panel-heading border-b border-border/70 pb-4">
        <div>
          <p className="section-label">Business profile</p>
          <h2>Workspace details</h2>
          <p>Values are validated and stored by the Soho Suite backend.</p>
        </div>
        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-surface-sunken text-muted-foreground border border-border/60">
          Code: {business.businessCode}
        </span>
      </div>
      {!editable && <Message variant="warning" text="You can view these details, but only an owner or manager can edit the business profile." />}
      <form className="form-grid form-stack pt-2" onSubmit={(event) => void submit(event)}>
        <label>Trading name<input name="tradingName" defaultValue={business.tradingName ?? business.company} required maxLength={255} disabled={!editable} /></label>
        <label>Legal business name<input name="legalBusinessName" defaultValue={business.legalBusinessName ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>Business type<select name="businessType" defaultValue={business.businessType ?? ''} disabled={!editable}><option value="">Not set</option><option value="RETAIL">Retail</option><option value="MANUFACTURING">Manufacturing</option><option value="SERVICES">Services</option></select></label>
        <label>Legal structure<select name="legalStructure" defaultValue={business.legalStructure ?? ''} disabled={!editable}><option value="">Not set</option><option value="SOLE_PROPRIETORSHIP">Sole proprietorship</option><option value="PARTNERSHIP">Partnership</option><option value="PRIVATE_LIMITED">Private limited</option></select></label>
        <label>Industry<input name="industry" defaultValue={business.industry ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>Business email<input name="businessEmail" type="email" defaultValue={business.businessEmail ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>
          Currency code
          <input className="font-mono uppercase" name="businessCurrency" defaultValue={business.businessCurrency ?? ''} pattern="[A-Za-z]{3}" maxLength={3} required disabled={!editable} />
          <small className="text-muted-foreground">Amounts are not converted when the currency changes.</small>
        </label>
        <label>Financial year starts in<select name="financialYearStartMonth" defaultValue={business.financialYearStartMonth ?? 1} disabled={!editable}>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index}>{new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2025, index, 1))}</option>)}</select></label>
        <label>Country<input name="country" defaultValue={business.country ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>State or region<input name="state" defaultValue={business.state ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>City<input name="city" defaultValue={business.city ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>Postal code<input name="pincode" defaultValue={business.pincode ?? ''} maxLength={255} disabled={!editable} /></label>
        {editable && (
          <div className="form-actions pt-2">
            <button className="button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save business details'}</button>
          </div>
        )}
      </form>
    </section>

    <section className="content-panel panel-pad flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="section-label">Access & Team</p>
        <h2>Membership controls</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Team members, invitations, and workspace ownership are managed in the Team section.</p>
      </div>
      <RouteLink className="button-secondary shrink-0" to="/team">Open team settings</RouteLink>
    </section>

    {role === 'OWNER' && (
      <section className="business-danger-zone rounded-xl border border-destructive/30 bg-destructive-soft/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-destructive">Delete this business workspace</h2>
          <p className="text-xs text-muted-foreground mt-0.5">This permanently removes the workspace and all its data. This action cannot be undone.</p>
        </div>
        <button className="button-danger shrink-0" type="button" onClick={() => setConfirmDelete(true)}>Delete business workspace</button>
      </section>
    )}
    {confirmDelete && <ConfirmDialog title={`Delete ${business.tradingName || business.company}?`} description="This permanently removes the business workspace and its memberships. You will need another workspace or create a new one to continue." confirmLabel="Delete business" destructive busy={busy} onCancel={() => setConfirmDelete(false)} onConfirm={() => void removeBusiness()} />}
  </div>
}

export function ProfileSettingsPage({ onError, onNotice }: PageCallbacks) {
  const { profile, replaceProfile } = useWorkspace()
  const [busy, setBusy] = useState(false)
  async function copyProfileId() {
    try {
      await navigator.clipboard.writeText(String(profile.id))
      onNotice('Profile ID copied.')
    } catch {
      onError('Could not access the clipboard. Select the profile ID and copy it manually.')
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const phone = String(form.get('phone') ?? '').trim()
    const body: UpdateProfile = {
      firstName: String(form.get('firstName')).trim(),
      lastName: String(form.get('lastName')).trim(),
      ...(phone ? { phone } : {}),
    }
    setBusy(true); onError('')
    try { replaceProfile(await updateProfile(body)); onNotice('Profile details saved.') }
    catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  return <div className="feature-stack"><PageHeader eyebrow="Account" title="Profile settings" description="Manage the profile details connected to your secure sign-in account." /><section className="content-panel panel-pad settings-profile">
    <div className="panel-heading"><div><p className="section-label">Your account</p><h2>Profile details</h2><p>Email is managed by Firebase Authentication and cannot be changed here.</p></div></div>
    <form className="form-grid form-stack" onSubmit={(event) => void submit(event)}>
      <label>First name<input name="firstName" defaultValue={profile.firstName} required autoComplete="given-name" /></label>
      <label>Last name<input name="lastName" defaultValue={profile.lastName} required autoComplete="family-name" /></label>
      <label>Phone <span className="optional-label">Optional</span><input name="phone" defaultValue={profile.phone ?? ''} autoComplete="tel" /></label>
      <label>Email<input value={profile.email} disabled /></label>
      <div className="profile-id-field"><label>Profile ID<input value={profile.id} readOnly title="Share this ID with a workspace owner to join a team" onFocus={(event) => event.currentTarget.select()} /></label><button className="button-secondary" type="button" onClick={() => void copyProfileId()}>Copy ID</button></div>
      <div className="form-actions"><button className="button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button></div>
    </form>
  </section></div>
}
function messageOf(error: unknown) { return formatApiError(error) }
