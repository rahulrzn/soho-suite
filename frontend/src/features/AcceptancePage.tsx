import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { acceptInvitation, acceptOwnershipTransfer } from '../api/collaborationApi'
import type { AppRoute } from '../app/routes'
import { navigate } from '../app/navigation'
import { BrandWordmark } from '../soho/shell/logo'
import type { PageCallbacks } from './types'

export function AcceptancePage({ route, search, onError, onNotice, onAccepted }: PageCallbacks & { route: AppRoute; search: string; onAccepted: () => Promise<void> }) {
  const ownership = route.name === 'ownership-accept'
  const path = ownership ? '/accept-ownership-transfer' : '/accept-invitation'
  const [token, setToken] = useState(() => new URLSearchParams(search).get('token') ?? '')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('token')) navigate(path, true)
  }, [path])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token.trim() || busy) return
    setBusy(true); onError('')
    try {
      if (ownership) await acceptOwnershipTransfer(token.trim())
      else await acceptInvitation(token.trim())
      setComplete(true)
      onNotice(ownership ? 'Ownership transfer accepted. Your business role has changed.' : 'Invitation accepted. Your business membership is active.')
      await onAccepted()
    } catch (error) { onError(error instanceof Error ? error.message : 'This link could not be accepted. It may be expired, revoked, or intended for another account.') }
    finally { setBusy(false) }
  }
  return <main className="onboarding-page"><div className="onboarding-brand"><BrandWordmark /></div><section className="onboarding-card acceptance-card"><p className="auth-overline">BUSINESS COLLABORATION</p><h1>{complete ? 'You’re all set' : ownership ? 'Accept ownership transfer' : 'Accept business invitation'}</h1><p className="auth-lede">{complete ? 'Return to your workspace to see your updated access.' : ownership ? 'The current owner offered to transfer the business to your account. Acceptance changes your role to owner.' : 'This invitation is for the signed-in account. Your verified email must match the invited address.'}</p>
    {complete ? <button className="button-primary" type="button" onClick={() => navigate('/overview')}>Open workspace <span aria-hidden="true">→</span></button> : <form className="field-stack" onSubmit={(event) => void submit(event)}><label>One-time acceptance token<input value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" required /></label><p className="quiet-text">This token is used only for this acceptance request. Do not share it with anyone else.</p><div className="form-actions"><button className="button-primary" disabled={busy || !token.trim()}>{busy ? 'Checking invitation…' : ownership ? 'Accept transfer' : 'Accept invitation'}</button><button className="button-secondary" type="button" onClick={() => navigate('/overview')}>Cancel</button></div></form>}
  </section></main>
}
