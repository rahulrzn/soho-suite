import { useState } from 'react'
import type { FormEvent } from 'react'
import { deleteBusiness, updateBusiness } from '../api/businessApi'
import { updateProfile } from '../api/userApi'
import { formatApiError } from '../api/formatError'
import { useWorkspace } from '../app/WorkspaceContext'
import { RouteLink } from '../app/navigation'
import { Message } from '../components/Feedback'
import { ConfirmDialog } from '../components/Modal'
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
    <section className="content-panel panel-pad"><div className="panel-heading"><div><p className="section-label">BUSINESS PROFILE</p><h2>Workspace details</h2><p>Changes are validated and stored by the Soho Suite backend.</p></div><span className="status-tag status-muted">{business.businessCode}</span></div>
      {!editable && <Message variant="warning" text="You can view these details, but only an owner or manager can edit the business profile." />}
      <form className="form-grid form-stack" onSubmit={(event) => void submit(event)}>
        <label>Trading name<input name="tradingName" defaultValue={business.tradingName ?? business.company} required maxLength={255} disabled={!editable} /></label>
        <label>Legal business name<input name="legalBusinessName" defaultValue={business.legalBusinessName ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>Business type<select name="businessType" defaultValue={business.businessType ?? ''} disabled={!editable}><option value="">Not set</option><option value="RETAIL">Retail</option><option value="MANUFACTURING">Manufacturing</option><option value="SERVICES">Services</option></select></label>
        <label>Legal structure<select name="legalStructure" defaultValue={business.legalStructure ?? ''} disabled={!editable}><option value="">Not set</option><option value="SOLE_PROPRIETORSHIP">Sole proprietorship</option><option value="PARTNERSHIP">Partnership</option><option value="PRIVATE_LIMITED">Private limited</option></select></label>
        <label>Industry<input name="industry" defaultValue={business.industry ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>Business email<input name="businessEmail" type="email" defaultValue={business.businessEmail ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>Currency code<input name="businessCurrency" defaultValue={business.businessCurrency ?? ''} pattern="[A-Za-z]{3}" maxLength={3} required disabled={!editable} /><small>Amounts are not converted when the currency changes.</small></label>
        <label>Financial year starts in<select name="financialYearStartMonth" defaultValue={business.financialYearStartMonth ?? 1} disabled={!editable}>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index}>{new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2025, index, 1))}</option>)}</select></label>
        <label>Country<input name="country" defaultValue={business.country ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>State or region<input name="state" defaultValue={business.state ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>City<input name="city" defaultValue={business.city ?? ''} maxLength={255} disabled={!editable} /></label>
        <label>Postal code<input name="pincode" defaultValue={business.pincode ?? ''} maxLength={255} disabled={!editable} /></label>
        {editable && <div className="form-actions"><button className="button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save business details'}</button></div>}
      </form>
    </section>
    <section className="content-panel panel-pad"><p className="section-label">ACCESS</p><h2>Membership controls</h2><p className="quiet-text">Team members, invitations, and ownership are managed in the Team section. The backend checks access for every request.</p><RouteLink className="button-secondary" to="/team">Open team settings</RouteLink></section>
    {role === 'OWNER' && <section className="business-danger-zone"><div><h2>Delete this business</h2><p>This removes the workspace and its membership access. This action cannot be undone.</p></div><button className="button-danger" type="button" onClick={() => setConfirmDelete(true)}>Delete business workspace</button></section>}
    {confirmDelete && <ConfirmDialog title={`Delete ${business.tradingName || business.company}?`} description="This permanently removes the business workspace and its memberships. You will need another workspace or create a new one to continue." confirmLabel="Delete business" destructive busy={busy} onCancel={() => setConfirmDelete(false)} onConfirm={() => void removeBusiness()} />}
  </div>
}

export function ProfileSettingsPage({ onError, onNotice }: PageCallbacks) {
  const { profile, replaceProfile } = useWorkspace()
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const body = {
      firstName: String(form.get('firstName')).trim(),
      lastName: String(form.get('lastName')).trim(),
      phone: String(form.get('phone')).trim(),
    }
    setBusy(true); onError('')
    try { replaceProfile(await updateProfile(body)); onNotice('Profile details saved.') }
    catch (error) { onError(messageOf(error)) }
    finally { setBusy(false) }
  }
  return <section className="content-panel panel-pad settings-profile">
    <div className="panel-heading"><div><p className="section-label">YOUR ACCOUNT</p><h2>Profile details</h2><p>Email is managed by Firebase Authentication and cannot be changed here.</p></div></div>
    <form className="form-grid form-stack" onSubmit={(event) => void submit(event)}>
      <label>First name<input name="firstName" defaultValue={profile.firstName} required autoComplete="given-name" /></label>
      <label>Last name<input name="lastName" defaultValue={profile.lastName} required autoComplete="family-name" /></label>
      <label>Phone <span className="optional-label">Optional</span><input name="phone" defaultValue={profile.phone ?? ''} autoComplete="tel" /></label>
      <label>Email<input value={profile.email} disabled /></label>
      <div className="form-actions"><button className="button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button></div>
    </form>
  </section>
}
function messageOf(error: unknown) { return formatApiError(error) }
