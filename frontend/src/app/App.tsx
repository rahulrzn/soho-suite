/* eslint-disable react-hooks/set-state-in-effect -- Effects synchronize auth and server workspace state with React state. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { onAuthStateChanged, reload } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { ApiError } from '../api/apiTransport'
import { formatApiError } from '../api/formatError'
import { getDefaultApiBaseUrl } from '../api/apiClient'
import { listBusinesses, listMembers } from '../api/businessApi'
import type { Business, BusinessMember, BusinessRole, UserProfile } from '../api/models'
import { createBusiness } from '../api/businessApi'
import { createProfile } from '../api/userApi'
import { getMyProfile } from '../api/userApi'
import { getCurrentFirebaseUser, logout, sendPasswordReset, sendVerificationEmail, signInWithEmail, signInWithGoogle, signUpWithEmail } from '../auth/authService'
import { auth, firebaseConfigurationError } from '../firebase'
import { ProductionAppShell } from '../soho/shell/ProductionAppShell'
import { navigate, useCurrentPath } from './navigation'
import { WorkspaceProvider } from './WorkspaceContext'
import type { WorkspaceState } from './WorkspaceContext'
import { IntegrationDashboard } from '../App'
import { WorkspacePage } from '../features/WorkspacePage'
import { AcceptancePage } from '../features/AcceptancePage'
import { Message } from '../components/Feedback'

type WorkspaceStatus = 'loading' | 'profile' | 'business' | 'ready' | 'error'
const activeBusinessStorageKey = 'sohosuite.active-business-id'

export default function App() {
  const location = useCurrentPath()
  const isIntegration = location.route.name === 'integration' || new URLSearchParams(location.search).get('tools') === 'integration'
  const [user, setUser] = useState<User | null>(() => getCurrentFirebaseUser())
  const [authLoading, setAuthLoading] = useState(true)
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>('loading')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessId, setBusinessId] = useState<number | null>(null)
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [pageError, setPageError] = useState('')
  const [pageNotice, setPageNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser)
    setAuthLoading(false)
    setPageError('')
    setPageNotice('')
  }), [])

  const loadWorkspace = useCallback(async () => {
    if (!user?.emailVerified) return
    setWorkspaceStatus('loading')
    setPageError('')
    try {
      let nextProfile: UserProfile
      try {
        nextProfile = await getMyProfile()
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setProfile(null)
          setBusinesses([])
          setBusinessId(null)
          setMembers([])
          setWorkspaceStatus('profile')
          return
        }
        throw error
      }
      const nextBusinesses = await listBusinesses()
      setProfile(nextProfile)
      setBusinesses(nextBusinesses)
      const storedId = Number(sessionStorage.getItem(`${activeBusinessStorageKey}:${user.uid}`))
      const chosen = nextBusinesses.find((item) => item.id === storedId) ?? nextBusinesses.find((item) => item.id === nextProfile.business?.id) ?? nextBusinesses[0]
      setBusinessId(chosen?.id ?? null)
      setMembers([])
      setWorkspaceStatus(chosen ? 'ready' : 'business')
    } catch (error) {
      setPageError(errorMessage(error))
      setWorkspaceStatus('error')
    }
  }, [user])

  useEffect(() => {
    if (!user?.emailVerified) {
      setProfile(null)
      setBusinesses([])
      setBusinessId(null)
      setMembers([])
      setWorkspaceStatus('loading')
      return
    }
    void loadWorkspace()
  }, [user, loadWorkspace])

  const activeBusiness = businesses.find((item) => item.id === businessId) ?? null
  const refreshMembers = useCallback(async () => {
    if (!activeBusiness) { setMembers([]); return }
    try { setMembers(await listMembers(activeBusiness.id)) }
    catch (error) { setPageError(errorMessage(error)); setMembers([]) }
  }, [activeBusiness])

  useEffect(() => { void refreshMembers() }, [refreshMembers])

  const selectBusiness = useCallback((id: number) => {
    setBusinessId(id)
    setMembers([])
    try { if (user) sessionStorage.setItem(`${activeBusinessStorageKey}:${user.uid}`, String(id)) } catch { /* Session storage is optional. */ }
    setPageError('')
    setPageNotice('')
  }, [user])

  const role = useMemo<BusinessRole | ''>(() => {
    if (!profile) return ''
    return members.find((member) => member.userId === profile.id)?.role ?? ''
  }, [profile, members])

  const workspace: WorkspaceState | null = user && profile && activeBusiness ? {
    user, profile, businesses, business: activeBusiness, members, role,
    refreshWorkspace: loadWorkspace,
    selectBusiness,
    refreshMembers,
    replaceProfile: setProfile,
  } : null

  async function handleSignOut() {
    await logout()
    setUser(null)
    setProfile(null)
    setPageError('')
    navigate('/overview', true)
  }

  async function withBusy(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setPageError('')
    setPageNotice('')
    try { await action() } catch (error) { setPageError(errorMessage(error)) } finally { setBusy(false) }
  }

  if (firebaseConfigurationError) return <ConfigurationScreen title="Firebase setup required" message={firebaseConfigurationError} />
  try { getDefaultApiBaseUrl() } catch (error) { return <ConfigurationScreen title="Backend setup required" message={errorMessage(error)} /> }
  if (authLoading) return <CenteredState title="Opening your workspace" message="Checking your secure sign-in session…" loading />
  if (isIntegration) return <IntegrationDashboard />
  if (!user) return <AuthScreen onError={setPageError} error={pageError} />
  if (!user.emailVerified) return <VerificationScreen user={user} onUser={setUser} onSignOut={handleSignOut} onNotice={setPageNotice} onError={setPageError} notice={pageNotice} error={pageError} />
  if (location.route.name === 'invitation-accept' || location.route.name === 'ownership-accept') return <AcceptancePage route={location.route} search={location.search} onError={setPageError} onNotice={setPageNotice} onAccepted={async () => { await loadWorkspace(); navigate('/overview', true) }} />
  if (workspaceStatus === 'loading') return <CenteredState title="Loading your workspace" message="Your business details and access are being checked with Soho Suite." loading />
  if (workspaceStatus === 'error') return <CenteredState title="We could not open this workspace" message={pageError || 'The backend did not return your workspace.'} actionLabel="Try again" onAction={() => void loadWorkspace()} secondaryLabel="Sign out" onSecondary={handleSignOut} />
  if (workspaceStatus === 'profile') return <OnboardingCard title="Set up your profile" description="Add the profile details your business workspace uses." error={pageError} notice={pageNotice} onSignOut={() => void handleSignOut()}>
    <ProfileForm disabled={busy} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void withBusy(async () => { const created = await createProfile({ username: String(form.get('username')).trim(), firstName: String(form.get('firstName')).trim(), lastName: String(form.get('lastName')).trim(), phone: String(form.get('phone')).trim() || undefined }); setProfile(created); await loadWorkspace() }) }} />
  </OnboardingCard>
  if (workspaceStatus === 'business') return <OnboardingCard title="Create your business workspace" description="Your business profile and operating data stay in your Soho Suite backend." error={pageError} notice={pageNotice} onSignOut={() => void handleSignOut()}>
    <BusinessForm disabled={busy} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get('tradingName')).trim(); void withBusy(async () => { await createBusiness({ company: name, tradingName: name, businessCurrency: String(form.get('businessCurrency')).trim().toUpperCase(), businessType: String(form.get('businessType')), industry: String(form.get('industry')).trim() || undefined, financialYearStartMonth: Number(form.get('financialYearStartMonth')) }); setPageNotice('Business workspace created.'); await loadWorkspace() }) }} />
  </OnboardingCard>
  if (!workspace || !activeBusiness || !profile) return <CenteredState title="Workspace unavailable" message="No business workspace is available for this account." actionLabel="Reload" onAction={() => void loadWorkspace()} secondaryLabel="Sign out" onSecondary={handleSignOut} />

  const content = workspaceStatus === 'ready' ? <WorkspaceProvider value={workspace}>
    <ProductionAppShell profile={profile} businesses={businesses} business={activeBusiness} role={role} onSelectBusiness={selectBusiness} onSignOut={() => void handleSignOut()}>
      {pageError && <Message variant="error" text={pageError} onDismiss={() => setPageError('')} />}
      {pageNotice && <Message variant="success" text={pageNotice} onDismiss={() => setPageNotice('')} />}
      <WorkspacePage key={String(activeBusiness.id) + ':' + location.route.name + (location.route.name === 'dataset-detail' ? ':' + location.route.datasetId : '')} route={location.route} onNotice={setPageNotice} onError={setPageError} />
    </ProductionAppShell>
  </WorkspaceProvider> : null
  return content
}

function AuthScreen({ error, onError }: { error: string; onError: (value: string) => void }) {
  const [mode, setMode] = useState<'sign-in' | 'register' | 'reset'>('sign-in')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password') ?? '')
    setBusy(true); onError(''); setNotice('')
    try {
      if (mode === 'reset') {
        await sendPasswordReset(email)
        setNotice('If the account can receive a reset email, Firebase has sent one.')
      } else if (mode === 'register') {
        await signUpWithEmail(email, password)
        await sendVerificationEmail()
        setNotice('Your account is ready. Check your inbox to verify your email before opening the workspace.')
      } else {
        await signInWithEmail(email, password)
      }
    } catch (reason) { onError(authMessage(reason)) } finally { setBusy(false) }
  }
  return <main className="auth-layout">
    <section className="auth-story"><div className="auth-brand"><span className="brand-symbol">S</span><span>soho<span className="brand-light">suite</span></span></div><div className="auth-story-copy"><p className="page-kicker">A CALMER WAY TO RUN YOUR BUSINESS</p><h1>Clarity for the work<br /><em>you do every day.</em></h1><p>Bring your business workspace, imported data, and daily operations together in one considered place.</p></div><div className="story-foot"><span>PRIVATE BY WORKSPACE</span><span>BUILT FOR SMALL BUSINESS</span></div></section>
    <section className="auth-panel"><div className="auth-mobile-brand"><span className="brand-symbol">S</span><span>soho<span className="brand-light">suite</span></span></div><div className="auth-form-wrap"><p className="auth-overline">YOUR BUSINESS WORKSPACE</p><h2>{mode === 'sign-in' ? 'Welcome back' : mode === 'register' ? 'Create your account' : 'Reset your password'}</h2><p className="auth-lede">{mode === 'sign-in' ? 'Sign in to continue to your workspace.' : mode === 'register' ? 'Start with your secure Soho Suite account.' : 'We’ll send a reset link if the account can receive email.'}</p>
      {error && <Message variant="error" text={error} />}{notice && <Message variant="success" text={notice} />}
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={255} /></label>
        {mode !== 'reset' && <label>Password<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={6} required /></label>}
        <button className="button-primary button-wide" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'reset' ? 'Send reset link' : mode === 'register' ? 'Create account' : 'Sign in'}<span aria-hidden="true">→</span></button>
      </form>
      {mode === 'sign-in' && <><div className="auth-divider"><span>OR</span></div><button className="button-secondary button-wide google-button" type="button" disabled={busy} onClick={() => { setBusy(true); onError(''); void signInWithGoogle().catch((reason) => onError(authMessage(reason))).finally(() => setBusy(false)) }}><GoogleMark />Continue with Google</button><button className="text-action forgot-action" type="button" onClick={() => { setMode('reset'); onError(''); setNotice('') }}>Forgot password?</button></>}
      <p className="auth-switch">{mode === 'sign-in' ? 'New to Soho Suite?' : 'Already have an account?'} <button className="text-action" type="button" onClick={() => { setMode(mode === 'sign-in' ? 'register' : 'sign-in'); onError(''); setNotice('') }}>{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</button></p>
      <p className="auth-privacy">Your account is secured by Firebase Authentication. Business data is served by your Soho Suite backend.</p>
    </div></section>
  </main>
}

function VerificationScreen({ user, onUser, onSignOut, onNotice, onError, notice, error }: { user: User; onUser: (user: User | null) => void; onSignOut: () => void; onNotice: (value: string) => void; onError: (value: string) => void; notice: string; error: string }) {
  const [busy, setBusy] = useState(false)
  return <CenteredState title="Verify your email" message={`A verification link is required before business data can be opened. Check the inbox for ${user.email || 'your account'}.`} actionLabel={busy ? 'Checking…' : 'I have verified my email'} onAction={() => { setBusy(true); onError(''); void reload(user).then(() => { const current = auth.currentUser; if (current?.emailVerified) { onUser(current); onNotice('Email verified. Your workspace is loading.') } else onError('Firebase still reports this email as unverified. Open the latest verification link and try again.') }).catch((reason) => onError(authMessage(reason))).finally(() => setBusy(false)) }} secondaryLabel="Resend verification email" onSecondary={() => { onError(''); void sendVerificationEmail().then(() => onNotice('A new verification email has been sent.')).catch((reason) => onError(authMessage(reason))) }} tertiaryLabel="Sign out" onTertiary={onSignOut} error={error} notice={notice} />
}

function ProfileForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="form-grid form-stack" onSubmit={onSubmit}>
    <label>Username<input name="username" autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" required /></label>
    <label>First name<input name="firstName" autoComplete="given-name" required /></label>
    <label>Last name<input name="lastName" autoComplete="family-name" required /></label>
    <label>Phone <span className="optional-label">Optional</span><input name="phone" autoComplete="tel" /></label>
    <div className="form-actions"><button className="button-primary" disabled={disabled}>Save profile</button></div>
  </form>
}

function BusinessForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="form-grid form-stack" onSubmit={onSubmit}>
    <label>Business name<input name="tradingName" autoComplete="organization" maxLength={255} required /></label>
    <label>Currency code<input name="businessCurrency" placeholder="Three-letter ISO code" pattern="[A-Za-z]{3}" maxLength={3} required /></label>
    <label>Business type<select name="businessType" defaultValue="" required><option value="" disabled>Choose a business type</option><option value="RETAIL">Retail</option><option value="MANUFACTURING">Manufacturing</option><option value="SERVICES">Services</option></select></label>
    <label>Industry <span className="optional-label">Optional</span><input name="industry" maxLength={255} /></label>
    <label>Financial year starts in<select name="financialYearStartMonth" defaultValue="" required><option value="" disabled>Choose a month</option>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index}>{new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2025, index, 1))}</option>)}</select></label>
    <div className="form-actions"><button className="button-primary" disabled={disabled}>Create workspace</button></div>
  </form>
}

function OnboardingCard({ title, description, children, error, notice, onSignOut }: { title: string; description: string; children: ReactNode; error: string; notice: string; onSignOut: () => void }) {
  return <main className="onboarding-page"><div className="onboarding-brand"><span className="brand-symbol">S</span><span>soho<span className="brand-light">suite</span></span></div><section className="onboarding-card"><p className="auth-overline">YOUR WORKSPACE</p><h1>{title}</h1><p className="auth-lede">{description}</p>{error && <Message variant="error" text={error} />}{notice && <Message variant="success" text={notice} />}{children}<button className="text-action onboarding-signout" type="button" onClick={onSignOut}>Sign out</button></section></main>
}

function CenteredState({ title, message, loading, actionLabel, onAction, secondaryLabel, onSecondary, tertiaryLabel, onTertiary, error, notice }: { title: string; message: string; loading?: boolean; actionLabel?: string; onAction?: () => void; secondaryLabel?: string; onSecondary?: () => void; tertiaryLabel?: string; onTertiary?: () => void; error?: string; notice?: string }) {
  return <main className="centered-state"><div className="state-brand"><span className="brand-symbol">S</span><span>soho<span className="brand-light">suite</span></span></div><section className="state-content"><span className={`state-icon${loading ? ' is-loading' : ''}`} aria-hidden="true">{loading ? '◌' : 'S'}</span><p className="auth-overline">BUSINESS WORKSPACE</p><h1>{title}</h1><p className="auth-lede">{message}</p>{error && <Message variant="error" text={error} />}{notice && <Message variant="success" text={notice} />}{actionLabel && <button className="button-primary" type="button" onClick={onAction}>{actionLabel}</button>}{secondaryLabel && <button className="button-secondary state-secondary" type="button" onClick={onSecondary}>{secondaryLabel}</button>}{tertiaryLabel && <button className="text-action state-tertiary" type="button" onClick={onTertiary}>{tertiaryLabel}</button>}</section></main>
}

function ConfigurationScreen({ title, message }: { title: string; message: string }) {
  return <main className="centered-state"><div className="state-brand"><span className="brand-symbol">S</span><span>soho<span className="brand-light">suite</span></span></div><section className="state-content"><span className="state-icon" aria-hidden="true">!</span><p className="auth-overline">ENVIRONMENT CONFIGURATION</p><h1>{title}</h1><p className="auth-lede">{message}</p><p className="configuration-note">Set the required Vite environment variables in this frontend environment, then restart the development server or redeploy.</p></section></main>
}

function GoogleMark() { return <svg viewBox="0 0 20 20" aria-hidden="true"><path fill="#4285F4" d="M19.6 10.23c0-.68-.06-1.36-.18-2.02H10v3.82h5.38a4.6 4.6 0 0 1-2 3.02v2.48h3.23c1.9-1.75 3-4.32 3-7.3Z"/><path fill="#34A853" d="M10 20c2.7 0 4.96-.9 6.62-2.47l-3.23-2.48c-.9.6-2.05.97-3.39.97-2.6 0-4.8-1.75-5.6-4.1H1.06v2.55A10 10 0 0 0 10 20Z"/><path fill="#FBBC05" d="M4.4 11.92a6 6 0 0 1 0-3.84V5.53H1.06a10 10 0 0 0 0 8.94l3.34-2.55Z"/><path fill="#EA4335" d="M10 3.98c1.47 0 2.8.5 3.84 1.5l2.88-2.89A9.62 9.62 0 0 0 10 0a10 10 0 0 0-8.94 5.53L4.4 8.08C5.2 5.73 7.4 3.98 10 3.98Z"/></svg> }

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your sign-in session could not be authorized. Sign out and sign in again.'
    if (error.status === 403) return 'Your current business membership does not allow this action.'
    if (error.status === 409) return error.message || 'This change conflicts with current workspace data.'
    if (error.status === 413) return error.message || 'The server rejected this upload or export because it exceeds the supported limit.'
    return formatApiError(error)
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

function authMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (code.includes('email-already-in-use')) return 'An account already uses this email. Try signing in instead.'
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'The email or password is incorrect.'
  if (code.includes('weak-password')) return 'Choose a stronger password with at least six characters.'
  if (code.includes('popup-closed-by-user')) return 'The Google sign-in window was closed before sign-in completed.'
  if (error instanceof Error && error.message) return error.message
  return 'Firebase Authentication could not complete this request.'
}
