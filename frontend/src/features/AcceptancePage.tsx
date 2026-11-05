import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { acceptInvitation, acceptOwnershipTransfer } from '../api/collaborationApi'
import type { AppRoute } from '../app/routes'
import { navigate } from '../app/navigation'
import { BrandWordmark } from '../soho/shell/logo'
import { Message } from '../components/Feedback'
import type { PageCallbacks } from './types'

export function AcceptancePage({ route, search, onError, onNotice, onAccepted }: PageCallbacks & { route: AppRoute; search: string; onAccepted: () => Promise<void> }) {
  const ownership = route.name === 'ownership-accept'
  const path = ownership ? '/accept-ownership-transfer' : '/accept-invitation'
  const [token, setToken] = useState(() => new URLSearchParams(search).get('token') ?? '')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const [submitError, setSubmitError] = useState('')
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('token')) navigate(path, true)
  }, [path])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token.trim() || busy) return
    setBusy(true); setSubmitError(''); onError('')
    const acceptanceToken = tokenFromInput(token)
    try {
      if (ownership) await acceptOwnershipTransfer(acceptanceToken)
      else await acceptInvitation(acceptanceToken)
      setComplete(true)
      onNotice(ownership ? 'Ownership transfer accepted. Your business role has changed.' : 'Invitation accepted. Your business membership is active.')
      await onAccepted()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'This code could not be accepted. It may be expired, revoked, or intended for another account.'
      setSubmitError(message)
      onError(message)
    }
    finally { setBusy(false) }
  }
  return <main className="onboarding-page">
    <div className="onboarding-brand"><BrandWordmark /></div>
    <section className="onboarding-card acceptance-card">
      <p className="auth-overline">Business collaboration</p>
      <h1>{complete ? 'You are all set' : ownership ? 'Accept ownership transfer' : 'Accept business invitation'}</h1>
      <p className="auth-lede">{complete ? 'Return to your workspace to see your updated access.' : ownership ? 'The current owner offered to transfer the business to your account. Acceptance changes your role to owner.' : 'This invitation is for the signed-in account. Your verified email must match the invited address.'}</p>
      {complete ? <button className="button-primary" type="button" onClick={() => navigate('/overview')}>Open workspace</button> : <form className="field-stack" onSubmit={(event) => void submit(event)}>
        {submitError && <Message variant="error" text={submitError} />}
        <label>{ownership ? 'Transfer code or link' : 'Invitation code or link'}<input value={token} onChange={(event) => { setToken(event.target.value); setSubmitError('') }} autoComplete="off" placeholder="Paste the code or full acceptance link" required /></label>
        <p className="quiet-text">Paste the one-time code shared with you, or the full acceptance link. Keep it private.</p>
        <div className="form-actions">
          <button className="button-primary" disabled={busy || !token.trim()}>{busy ? 'Checking invitation...' : ownership ? 'Accept transfer' : 'Accept invitation'}</button>
          <button className="button-secondary" type="button" onClick={() => navigate('/overview')}>Back to workspace</button>
        </div>
        <div className="mt-3 pt-3 border-t border-border/60 text-center text-xs text-muted-foreground">
          <span>Don't have an invitation code? </span>
          <button className="font-semibold text-primary hover:underline cursor-pointer" type="button" onClick={() => navigate('/overview')}>Create your own workspace</button>
        </div>
      </form>}
    </section>
  </main>
}

function tokenFromInput(value: string) {
  const trimmed = value.trim()
  try {
    return new URL(trimmed, window.location.origin).searchParams.get('token')?.trim() || trimmed
  } catch {
    return trimmed
  }
}
