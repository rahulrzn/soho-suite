import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import {
  getCurrentFirebaseUser,
  logout,
  sendVerificationEmail,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from './auth/authService'
import { auth } from './firebase'
import WorkspaceApp from './WorkspaceApp'
import {
  apiRequest,
  getDefaultApiBaseUrl,
  type ApiResult,
} from './api/apiClient'

type Outcome = 'Passed' | 'Failed' | 'Inconclusive'
type TestResult = {
  id: number
  name: string
  expected: string
  actual: string
  outcome: Outcome
  details: string
  request?: ApiResult
  rerun?: () => void
}
type InspectorState = { request?: ApiResult; error?: string }

const roleLabels = ['OWNER', 'MANAGER', 'VIEWER'] as const
const safeTestNames = [
  'Unauthenticated protected request',
  'Read my user profile',
  'Check username availability',
  'List my businesses',
] as const

function describeBody(body: unknown): string {
  if (body === null || body === undefined || body === '') return 'No response body'
  return typeof body === 'string' ? body : JSON.stringify(body, null, 2)
}

function IntegrationDashboard() {
  const [user, setUser] = useState<User | null>(() => getCurrentFirebaseUser())
  const [apiBaseUrl, setApiBaseUrl] = useState(getDefaultApiBaseUrl())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [inspector, setInspector] = useState<InspectorState>({})
  const [results, setResults] = useState<TestResult[]>([])
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [username, setUsername] = useState('')
  const [profileForm, setProfileForm] = useState({ username: '', firstName: '', lastName: '', phone: '' })
  const [profilePatch, setProfilePatch] = useState({ firstName: '', lastName: '', phone: '' })
  const [businessId, setBusinessId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessCountry, setBusinessCountry] = useState('')
  const [businesses, setBusinesses] = useState<unknown>(null)
  const [targetUserId, setTargetUserId] = useState('')
  const [targetRole, setTargetRole] = useState<'MANAGER' | 'VIEWER'>('VIEWER')
  const [memberRoleTargetId, setMemberRoleTargetId] = useState('')
  const [memberTargetRole, setMemberTargetRole] = useState<'MANAGER' | 'VIEWER'>('VIEWER')

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  const profileRole = typeof profile?.businessRole === 'string' ? profile.businessRole : null
  const profileBusinessId = typeof profile?.business === 'object' && profile.business !== null
    ? (profile.business as Record<string, unknown>).id
    : null
  const signedInLabel = user?.email || 'Signed in Firebase account'

  const lastResult = useMemo(() => results[0], [results])

  function saveResult(result: TestResult) {
    setResults((current) => [result, ...current].slice(0, 30))
    if (result.request) setInspector({ request: result.request })
  }

  async function runTest(
    name: string,
    path: string,
    expectedStatuses: number[],
    options: { method?: string; body?: unknown; authenticated?: boolean } = {},
    expectedDescription = expectedStatuses.join(' or '),
    beforeMutation?: () => boolean,
  ): Promise<ApiResult | undefined> {
    if (beforeMutation && !beforeMutation()) return undefined
    setBusyAction(name)
    try {
      const request = await apiRequest(apiBaseUrl, path, options)
      const passed = expectedStatuses.includes(request.status)
      const statusOutcome: Outcome = passed ? 'Passed' : 'Failed'
      const details = passed
        ? `The backend returned the expected HTTP ${request.status}.`
        : `Expected HTTP ${expectedDescription}; received HTTP ${request.status}.`
      saveResult({
        id: Date.now() + Math.random(), name, expected: expectedDescription,
        actual: `HTTP ${request.status}`, outcome: statusOutcome, details, request,
        rerun: () => { void runTest(name, path, expectedStatuses, options, expectedDescription, beforeMutation) },
      })
      setInspector({ request })
      return request
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Request could not be completed.'
      setInspector({ error: message })
      saveResult({
        id: Date.now() + Math.random(), name, expected: expectedDescription,
        actual: 'No HTTP response', outcome: 'Inconclusive',
        details: message.includes('signed in')
          ? 'Sign in with Firebase to obtain a fresh ID token, then rerun this test.'
          : `No HTTP response was received. Check backend availability, URL, and CORS. ${message}`,
      })
      return undefined
    } finally {
      setBusyAction('')
    }
  }

  function confirmWrite(description: string): boolean {
    return window.confirm(`This action can change backend data. Continue?\n\n${description}`)
  }

  async function handleAuth(action: () => Promise<User>, success: string) {
    if (authBusy) return
    setAuthBusy(true)
    setAuthMessage('')
    try {
      const signedInUser = await action()
      setUser(signedInUser)
      setAuthMessage(success)
      setPassword('')
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Authentication failed.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleAuthForm(event: FormEvent<HTMLFormElement>, mode: 'sign-in' | 'sign-up') {
    event.preventDefault()
    if (mode === 'sign-up' && !window.confirm('Create a new Firebase Authentication account using this email? Continue?')) return
    const submitAuth = mode === 'sign-in' ? signInWithEmail : signUpWithEmail
    await handleAuth(() => submitAuth(email, password), mode === 'sign-in' ? 'Signed in.' : 'Account created and signed in.')
  }

  async function doPasswordReset() {
    try {
      await sendPasswordReset(email)
      setAuthMessage('If the account can receive a reset email, Firebase has sent one.')
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Could not send the reset email.')
    }
  }

  async function doSignOut() {
    await logout()
    setUser(null)
    setProfile(null)
    setBusinesses(null)
    setAuthMessage('Signed out.')
  }

  async function sendVerification() {
    try {
      await sendVerificationEmail()
      setAuthMessage('Verification email sent. Refresh the account status after verifying.')
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Could not send verification email.')
    }
  }

  async function refreshVerificationStatus() {
    try {
      await user?.reload()
      setUser(auth.currentUser)
      setAuthMessage('Firebase account status refreshed.')
    } catch (error: unknown) {
      setAuthMessage(error instanceof Error ? error.message : 'Could not refresh account status.')
    }
  }

  async function executeSafeTest(name: typeof safeTestNames[number]) {
    if (name === safeTestNames[0]) {
      await runTest(name, '/api/users/me', [401], { authenticated: false }, '401')
    } else if (name === safeTestNames[1]) {
      await runTest(name, '/api/users/me', [200, 404], {}, '200 (profile exists) or 404 (profile not provisioned)')
    } else if (name === safeTestNames[2]) {
      const candidate = username.trim()
      if (!candidate) {
        saveResult({ id: Date.now(), name, expected: '200', actual: 'Not run', outcome: 'Inconclusive', details: 'Enter a username to check first.' })
        return
      }
      await runTest(name, `/api/users/check-username?username=${encodeURIComponent(candidate)}`, [200], {}, '200')
    } else {
      const expected = user?.emailVerified === false ? [403] : [200, 404]
      const description = user?.emailVerified === false
        ? '403 EMAIL_VERIFICATION_REQUIRED'
        : '200 (business list, possibly empty) or 404 (profile missing)'
      await runTest(name, '/api/businesses', expected, {}, description)
    }
  }

  async function runAllSafeTests() {
    for (const name of safeTestNames) await executeSafeTest(name)
  }

  async function readProfile() {
    const response = await runTest('Read current user profile', '/api/users/me', [200, 404], {}, '200 or 404')
    if (response?.status === 200 && response.body && typeof response.body === 'object' && !Array.isArray(response.body)) {
      setProfile(response.body as Record<string, unknown>)
    } else if (response?.status === 404) {
      setProfile(null)
    }
  }

  async function listBusinesses() {
    const name = 'List my businesses'
    setBusyAction(name)
    try {
      const response = await apiRequest(apiBaseUrl, '/api/businesses')
      setBusinesses(response.body)
      if (Array.isArray(response.body) && response.body.length > 0) {
        const firstBusiness = response.body[0] as Record<string, unknown>
        if (firstBusiness.id !== undefined) setBusinessId(String(firstBusiness.id))
      }
      const expectedStatuses = user?.emailVerified === false ? [403] : [200, 404]
      const expectedText = user?.emailVerified === false ? '403 EMAIL_VERIFICATION_REQUIRED' : '200 or 404 if the profile is missing'
      const okay = expectedStatuses.includes(response.status)
      saveResult({ id: Date.now(), name, expected: expectedText, actual: `HTTP ${response.status}`, outcome: okay ? 'Passed' : 'Failed', details: okay ? `Backend returned the expected HTTP ${response.status}.` : `Expected ${expectedText}; received HTTP ${response.status}.`, request: response, rerun: () => { void listBusinesses() } })
      setInspector({ request: response })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Request could not be completed.'
      setInspector({ error: message })
      saveResult({ id: Date.now(), name, expected: 'Expected response for the current verification state', actual: 'No HTTP response', outcome: 'Inconclusive', details: message })
    } finally {
      setBusyAction('')
    }
  }

  const businessRequest = {
    tradingName: businessName.trim(),
    company: businessName.trim(),
    ...(businessCountry.trim() ? { country: businessCountry.trim() } : {}),
  }
  const businessPath = `/api/businesses/${encodeURIComponent(businessId.trim())}`
  const profileBusinessMatches = profileBusinessId !== null && String(profileBusinessId) === businessId.trim()

  async function runAuthorizationTest(kind: 'non-member' | 'viewer-write' | 'manager-owner' | 'owner-allowed' | 'unverified') {
    if (!user) {
      saveResult({ id: Date.now(), name: 'Authorization scenario', expected: 'Role-specific HTTP response', actual: 'Not run', outcome: 'Inconclusive', details: 'Sign in as the test account first.' })
      return
    }
    if (!businessId.trim()) {
      saveResult({ id: Date.now(), name: 'Authorization scenario', expected: 'Role-specific HTTP response', actual: 'Not run', outcome: 'Inconclusive', details: 'Enter a business ID, then rerun the scenario.' })
      return
    }
    if (kind === 'unverified') {
      if (user.emailVerified) {
        saveResult({ id: Date.now(), name: 'Unverified account restriction', expected: '403', actual: 'Not run', outcome: 'Inconclusive', details: 'The selected Firebase account is verified. Sign in as an unverified account to test this policy.' })
        return
      }
      await runTest('Unverified account cannot list businesses', '/api/businesses', [403], {}, '403 EMAIL_VERIFICATION_REQUIRED')
      return
    }
    if (kind === 'non-member') {
      if (!profile) {
        saveResult({ id: Date.now(), name: 'Non-member access denied', expected: '403', actual: 'Not run', outcome: 'Inconclusive', details: 'Read the current profile first. The backend returns 404 for business access when no local profile exists.' })
        return
      }
      if (profileBusinessMatches) {
        saveResult({ id: Date.now(), name: 'Non-member access denied', expected: '403', actual: 'Not run', outcome: 'Inconclusive', details: 'The selected business is this account’s own business. Use a different business ID and a profile that is not a member.' })
        return
      }
      await runTest('Non-member business access denied', businessPath, [403], {}, '403 FORBIDDEN')
      return
    }
    if (kind === 'viewer-write') {
      if (profileRole !== 'VIEWER') {
        saveResult({ id: Date.now(), name: 'VIEWER business write denied', expected: '403', actual: 'Not run', outcome: 'Inconclusive', details: `Current profile role is ${profileRole ?? 'unknown'}, not VIEWER.` })
        return
      }
      await runTest('VIEWER business update denied', businessPath, [403], { method: 'PUT', body: businessRequest }, '403 FORBIDDEN', () => confirmWrite(`Send a PUT to ${businessPath}. The expected VIEWER response is 403; if permissions differ, business data may be updated.`))
      return
    }
    if (kind === 'manager-owner') {
      if (profileRole !== 'MANAGER') {
        saveResult({ id: Date.now(), name: 'MANAGER owner-only action denied', expected: '403', actual: 'Not run', outcome: 'Inconclusive', details: `Current profile role is ${profileRole ?? 'unknown'}, not MANAGER.` })
        return
      }
      if (!targetUserId.trim() || !/^\d+$/.test(targetUserId.trim())) {
        saveResult({ id: Date.now(), name: 'MANAGER owner-only action denied', expected: '403', actual: 'Not run', outcome: 'Inconclusive', details: 'Enter an existing local user ID to try adding as a member.' })
        return
      }
      const path = `/api/businesses/${encodeURIComponent(businessId.trim())}/members`
      await runTest('MANAGER cannot add a member', path, [403], { method: 'POST', body: { userId: Number(targetUserId), role: targetRole } }, '403 FORBIDDEN', () => confirmWrite(`Attempt to add user ${targetUserId} to business ${businessId}. Expected 403 for MANAGER; if permissions differ, membership will change.`))
      return
    }
    if (kind === 'owner-allowed') {
      if (profileRole !== 'OWNER') {
        saveResult({ id: Date.now(), name: 'OWNER member operation allowed', expected: '200', actual: 'Not run', outcome: 'Inconclusive', details: `Current profile role is ${profileRole ?? 'unknown'}, not OWNER.` })
        return
      }
      if (!targetUserId.trim() || !/^\d+$/.test(targetUserId.trim())) {
        saveResult({ id: Date.now(), name: 'OWNER member operation allowed', expected: '200', actual: 'Not run', outcome: 'Inconclusive', details: 'Enter an existing local user ID that is not already a member.' })
        return
      }
      const path = `/api/businesses/${encodeURIComponent(businessId.trim())}/members`
      await runTest('OWNER can add a member', path, [200], { method: 'POST', body: { userId: Number(targetUserId), role: targetRole } }, '200', () => confirmWrite(`Add local user ${targetUserId} to business ${businessId} as ${targetRole}.`))
    }
  }

  async function profileWrite(mode: 'create' | 'update') {
    const body = mode === 'create'
      ? { username: profileForm.username.trim(), firstName: profileForm.firstName.trim(), lastName: profileForm.lastName.trim(), ...(profileForm.phone.trim() ? { phone: profileForm.phone.trim() } : {}) }
      : Object.fromEntries(Object.entries({ firstName: profilePatch.firstName.trim(), lastName: profilePatch.lastName.trim(), phone: profilePatch.phone.trim() }).filter(([, value]) => value))
    const name = mode === 'create' ? 'Create or provision profile' : 'Update current profile'
    const path = mode === 'create' ? '/api/users/profile' : '/api/users/me/profile'
    await runTest(name, path, mode === 'create' ? [200] : [200], { method: mode === 'create' ? 'POST' : 'PATCH', body }, '200', () => confirmWrite(`${mode === 'create' ? 'Create or return' : 'Update'} the profile for ${user?.email ?? 'the current account'}.`))
  }

  async function businessWrite(mode: 'create' | 'update') {
    const path = mode === 'create' ? '/api/businesses' : businessPath
    const name = mode === 'create' ? 'Create business' : 'Update business'
    await runTest(name, path, [200], { method: mode === 'create' ? 'POST' : 'PUT', body: businessRequest }, '200', () => confirmWrite(`${mode === 'create' ? 'Create a business for the current profile' : `Update business ${businessId}`}.`))
  }

  async function memberChange(action: 'add' | 'change-role' | 'remove') {
    const basePath = `${businessPath}/members`
    let path = basePath
    let method = 'POST'
    let body: unknown = { userId: Number(targetUserId), role: targetRole }
    let name = 'Add business member'
    if (action === 'change-role') {
      path = `${basePath}/${encodeURIComponent(memberRoleTargetId.trim())}/role`
      method = 'PATCH'
      body = { role: memberTargetRole }
      name = 'Change member role'
    } else if (action === 'remove') {
      path = `${basePath}/${encodeURIComponent(memberRoleTargetId.trim())}`
      method = 'DELETE'
      body = undefined
      name = 'Remove business member'
    }
    if (!businessId.trim() || (action === 'add' && !/^\d+$/.test(targetUserId.trim())) || (action !== 'add' && !/^\d+$/.test(memberRoleTargetId.trim()))) {
      saveResult({ id: Date.now(), name, expected: '200 or 204', actual: 'Not run', outcome: 'Inconclusive', details: 'Provide a valid business ID and local user ID first.' })
      return
    }
    const detail = action === 'add'
      ? `Add user ${targetUserId} as ${targetRole} to business ${businessId}.`
      : action === 'change-role'
        ? `Change user ${memberRoleTargetId} to ${memberTargetRole} in business ${businessId}.`
        : `Remove user ${memberRoleTargetId} from business ${businessId}.`
    await runTest(name, path, action === 'remove' ? [204] : [200], { method, body }, action === 'remove' ? '204 No Content' : '200', () => confirmWrite(detail))
  }

  async function deleteBusiness() {
    if (!businessId.trim()) return
    await runTest('Delete business (destructive)', businessPath, [204], { method: 'DELETE' }, '204 No Content', () => window.confirm(`Permanently delete business ${businessId} and clear all of its memberships?\n\nThis cannot be undone. Continue?`))
  }

  async function diagnostics() {
    const expected = !user ? [401] : [200, 404]
    const description = !user
      ? '401 (backend responded; authentication required)'
      : '200 or 404 (backend responded; profile may not exist yet)'
    await runTest('Backend connectivity diagnostic', '/api/users/me', expected, { authenticated: Boolean(user) }, description)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Soho Suite dashboard home"><span className="brand-mark">S</span><span>soho<span className="brand-light">suite</span></span></a>
        <div className="topbar-right"><span className="environment-pill"><i /> API workbench</span><span className="topbar-account">{user ? signedInLabel : 'No account connected'}</span></div>
      </header>

      <section id="top" className="hero">
        <div className="hero-copy"><p className="eyebrow">DEVELOPER TOOLKIT <span>•</span> LOCAL INTEGRATION</p><h1>Backend test<br /><em>workbench</em></h1><p className="hero-intro">A clear place to exercise your API, Firebase session, and business permissions. Every result comes from a live request.</p></div>
        <div className="hero-note"><span className="note-icon">↗</span><div><strong>Start with a connection check</strong><p>Calls the current-user endpoint and separates reachability from sign-in status.</p></div></div>
      </section>

      <div className="workspace">
        <aside className="side-nav" aria-label="Dashboard sections"><span className="side-caption">WORKSPACE</span><a href="#connection"><span>01</span> Connection</a><a href="#authentication"><span>02</span> Authentication</a><a href="#profile"><span>03</span> User profile</a><a href="#business"><span>04</span> Business</a><a href="#authorization"><span>05</span> Authorization</a><a href="#results"><span>06</span> Test results</a><div className="nav-hint"><span className="hint-spark">✳</span><p>Requests use your current Firebase session. Tokens and passwords stay out of the inspector.</p></div></aside>

        <div className="content-column">
          <section id="connection" className="panel connection-panel">
            <div className="section-heading"><div><p className="eyebrow">01 / CONNECTION</p><h2>Backend diagnostics</h2></div><span className="live-chip"><i /> LIVE REQUESTS</span></div>
            <p className="section-subtitle">The backend has no public health route, so diagnostics check an existing protected API route.</p>
            <div className="connection-controls"><label className="field grow">Backend base URL<input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder="http://localhost:8080" inputMode="url" /></label><button className="button button-dark" type="button" disabled={Boolean(busyAction)} onClick={() => void diagnostics()}>{busyAction === 'Backend connectivity diagnostic' ? 'Checking…' : 'Check connection'}<span>↗</span></button></div>
            <div className="diagnostic-hint"><span>i</span><p>{user ? 'With a signed-in account, 200 or 404 confirms the backend responded. A 401 points to token configuration.' : 'Without an account, a 401 confirms the backend responded and requires Firebase authentication.'} Network errors can indicate the backend is offline or the browser blocked the request through CORS.</p></div>
            {lastResult?.name === 'Backend connectivity diagnostic' && <div className={`diagnostic-result ${lastResult.outcome.toLowerCase()}`} role="status"><strong>{lastResult.outcome === 'Passed' ? 'Backend responded' : lastResult.outcome === 'Failed' ? 'Unexpected response' : 'No response received'}</strong><span>{lastResult.actual} · {lastResult.details}</span></div>}
          </section>

      <section id="authentication" className="panel">
            <div className="section-heading"><div><p className="eyebrow">02 / IDENTITY</p><h2>Firebase authentication</h2></div><span className={`status-pill ${user ? 'status-on' : 'status-off'}`}><i />{user ? 'CONNECTED' : 'SIGNED OUT'}</span></div>
            {user ? <div className="account-card"><div className="avatar">{(user.email?.[0] ?? 'U').toUpperCase()}</div><div className="account-details"><strong>{user.email || 'Firebase account'}</strong><span>{user.emailVerified ? 'Email verified' : 'Email not verified'}</span><small>UID: {user.uid}</small></div><div className="account-actions">{!user.emailVerified && <button className="button button-outline" type="button" onClick={() => void sendVerification()}>Send verification email</button>}<button className="text-button" type="button" onClick={() => void refreshVerificationStatus()}>Refresh status</button><button className="button button-dark" type="button" onClick={() => void doSignOut()}>Sign out</button></div></div> : <div className="auth-grid"><div className="auth-copy"><span className="auth-orbit">✳</span><h3>Use a Firebase test account</h3><p>Email/password and Google sign-in connect to the existing Firebase project settings in <code>frontend/.env</code>.</p><button className="button button-outline google-button" type="button" disabled={authBusy} onClick={() => void handleAuth(() => { if (!window.confirm('Google sign-in may create a Firebase account if this project has no account for the selected Google identity. Continue?')) return Promise.reject(new Error('Sign-in cancelled.')); return signInWithGoogle() }, 'Signed in with Google.')}> <span className="google-g">G</span> Continue with Google</button></div><div className="auth-form"><div className="form-title"><strong>Email and password</strong><span>{authMode === 'sign-in' ? 'Sign in to an existing test account' : 'Create a Firebase test account'}</span></div><form onSubmit={(event) => void handleAuthForm(event, authMode)}><label className="field">Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label className="field">Password<input type="password" autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></label><div className="auth-actions"><button className="button button-dark" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'sign-in' ? 'Sign in' : 'Create account'}</button><button className="button button-soft" type="button" disabled={authBusy} onClick={() => setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in')}>{authMode === 'sign-in' ? 'Create account' : 'Back to sign in'}</button></div></form><button className="text-button reset-button" type="button" onClick={() => void doPasswordReset()}>Forgot password?</button></div></div>}
            {authMessage && <p className="inline-message" role="status">{authMessage}</p>}
          </section>

          <section id="profile" className="panel">
            <div className="section-heading"><div><p className="eyebrow">03 / USER</p><h2>Profile API</h2></div><span className="endpoint-tag">/api/users</span></div>
            <p className="section-subtitle">Profile identity comes from the verified Firebase token. The API accepts username, names, and optional phone only.</p>
            <div className="action-row"><button className="button button-dark" type="button" disabled={Boolean(busyAction) || !user} onClick={() => void readProfile()}>GET <code>/me</code></button><div className="inline-check"><input aria-label="Username to check" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username_to_check" /><button className="button button-outline" type="button" disabled={Boolean(busyAction) || !user || !username.trim()} onClick={() => void executeSafeTest('Check username availability')}>Check availability</button></div></div>
            {profile && <div className="data-summary"><strong>Current profile</strong><span>{String(profile.username ?? '—')} · {String(profile.firstName ?? '')} {String(profile.lastName ?? '')}</span><span>Business role: {String(profileRole ?? 'None')}</span></div>}
            <details className="form-disclosure"><summary>Create or provision profile <span>POST /api/users/profile · writes data</span></summary><div className="disclosure-body"><div className="form-grid"><label className="field">Username (3–30 letters, digits, underscores)<input value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} /></label><label className="field">Phone (optional)<input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} /></label><label className="field">First name<input value={profileForm.firstName} onChange={(event) => setProfileForm({ ...profileForm, firstName: event.target.value })} /></label><label className="field">Last name<input value={profileForm.lastName} onChange={(event) => setProfileForm({ ...profileForm, lastName: event.target.value })} /></label></div><button className="button button-coral" type="button" disabled={!user || Boolean(busyAction)} onClick={() => void profileWrite('create')}>Create profile <span>↗</span></button></div></details>
            <details className="form-disclosure"><summary>Update current profile <span>PATCH /api/users/me/profile · writes data</span></summary><div className="disclosure-body"><p className="small-note">Leave a field blank to leave it unchanged. Username and email cannot be updated here.</p><div className="form-grid"><label className="field">First name<input value={profilePatch.firstName} onChange={(event) => setProfilePatch({ ...profilePatch, firstName: event.target.value })} /></label><label className="field">Last name<input value={profilePatch.lastName} onChange={(event) => setProfilePatch({ ...profilePatch, lastName: event.target.value })} /></label><label className="field">Phone<input value={profilePatch.phone} onChange={(event) => setProfilePatch({ ...profilePatch, phone: event.target.value })} /></label></div><button className="button button-coral" type="button" disabled={!user || Boolean(busyAction)} onClick={() => void profileWrite('update')}>Update profile <span>↗</span></button></div></details>
          </section>

          <section id="business" className="panel">
            <div className="section-heading"><div><p className="eyebrow">04 / BUSINESS</p><h2>Business management</h2></div><span className="endpoint-tag">/api/businesses</span></div>
            <p className="section-subtitle">Create requires a provisioned profile. Each user can belong to one business. Listing returns only your business.</p>
            <div className="action-row"><button className="button button-dark" type="button" disabled={!user || Boolean(busyAction)} onClick={() => void listBusinesses()}>GET <code>/api/businesses</code></button><label className="field business-id-field">Business ID<input value={businessId} onChange={(event) => setBusinessId(event.target.value)} placeholder="from your business list" inputMode="numeric" /></label><button className="button button-outline" type="button" disabled={!user || !businessId.trim() || Boolean(busyAction)} onClick={() => void runTest('Read business details', businessPath, [200], {}, '200 for a member')}>GET details</button><button className="button button-outline" type="button" disabled={!user || !businessId.trim() || Boolean(busyAction)} onClick={() => void runTest('Read business members', `${businessPath}/members`, [200], {}, '200 for a member')}>GET members</button></div>
            {businesses !== null && <div className="data-summary"><strong>Business list response</strong><pre>{describeBody(businesses)}</pre></div>}
            <details className="form-disclosure"><summary>Create a business <span>POST /api/businesses · writes data</span></summary><div className="disclosure-body"><p className="small-note">This compact form uses the backend’s company/tradingName and country fields. Other business fields are optional.</p><div className="form-grid"><label className="field">Trading / company name<input value={businessName} onChange={(event) => setBusinessName(event.target.value)} /></label><label className="field">Country<input value={businessCountry} onChange={(event) => setBusinessCountry(event.target.value)} /></label></div><button className="button button-coral" type="button" disabled={!user || !businessName.trim() || Boolean(busyAction)} onClick={() => void businessWrite('create')}>Create business <span>↗</span></button></div></details>
            <details className="form-disclosure"><summary>Update business details <span>PUT /api/businesses/{'{id}'} · writes data</span></summary><div className="disclosure-body"><p className="small-note">The current update form sends company/tradingName and country. Existing values may change.</p><div className="form-grid"><label className="field">Trading / company name<input value={businessName} onChange={(event) => setBusinessName(event.target.value)} /></label><label className="field">Country<input value={businessCountry} onChange={(event) => setBusinessCountry(event.target.value)} /></label></div><button className="button button-coral" type="button" disabled={!user || !businessId.trim() || !businessName.trim() || Boolean(busyAction)} onClick={() => void businessWrite('update')}>Update business <span>↗</span></button></div></details>
            <details className="form-disclosure"><summary>Manage members <span>POST / PATCH / DELETE · owner only · changes membership</span></summary><div className="disclosure-body"><p className="small-note">Only owners may add, change, or remove members. The target must be an existing local user ID. Owner removal and ownership transfer are unsupported.</p><div className="form-grid"><label className="field">User ID to add<input value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} inputMode="numeric" /></label><label className="field">New member role<select value={targetRole} onChange={(event) => setTargetRole(event.target.value as 'MANAGER' | 'VIEWER')}><option value="VIEWER">VIEWER</option><option value="MANAGER">MANAGER</option></select></label></div><div className="action-row"><button className="button button-coral" type="button" disabled={!user || !businessId.trim() || Boolean(busyAction)} onClick={() => void memberChange('add')}>Add member</button></div><div className="form-grid member-edit-grid"><label className="field">Existing member user ID<input value={memberRoleTargetId} onChange={(event) => setMemberRoleTargetId(event.target.value)} inputMode="numeric" /></label><label className="field">Assign role<select value={memberTargetRole} onChange={(event) => setMemberTargetRole(event.target.value as 'MANAGER' | 'VIEWER')}><option value="VIEWER">VIEWER</option><option value="MANAGER">MANAGER</option></select></label></div><div className="action-row"><button className="button button-outline" type="button" disabled={!user || !businessId.trim() || Boolean(busyAction)} onClick={() => void memberChange('change-role')}>Change role</button><button className="button button-danger-outline" type="button" disabled={!user || !businessId.trim() || Boolean(busyAction)} onClick={() => void memberChange('remove')}>Remove member</button></div></div></details>
            <details className="form-disclosure danger-disclosure"><summary>Delete business <span>DELETE /api/businesses/{'{id}'} · destructive</span></summary><div className="disclosure-body"><p className="danger-copy">This permanently deletes the business and clears all member associations. The request requires a second confirmation.</p><button className="button button-danger" type="button" disabled={!user || !businessId.trim() || Boolean(busyAction)} onClick={() => void deleteBusiness()}>Delete business…</button></div></details>
          </section>

          <section id="authorization" className="panel authorization-panel">
            <div className="section-heading"><div><p className="eyebrow">05 / ACCESS CONTROL</p><h2>Authorization checks</h2></div><span className="shield-mark">⬡</span></div>
            <p className="section-subtitle">Choose the account that represents each role, enter a business ID, then run that specific check. The dashboard will not switch accounts or change membership for you.</p>
            <div className="role-table"><div className="role-head"><span>ROLE</span><span>READ BUSINESS</span><span>UPDATE BUSINESS</span><span>MEMBER ADMIN</span></div>{roleLabels.map((role) => <div className={`role-row ${profileRole === role ? 'current-role' : ''}`} key={role}><strong>{role}{profileRole === role && <small> CURRENT</small>}</strong><span>Allowed</span><span>{role === 'VIEWER' ? 'Denied' : 'Allowed'}</span><span>{role === 'OWNER' ? 'Allowed' : 'Denied'}</span></div>)}</div>
            <div className="authz-controls"><label className="field">Existing local user ID for owner/manager checks<input value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} placeholder="numeric user ID" inputMode="numeric" /></label><label className="field">Role to assign if permitted<select value={targetRole} onChange={(event) => setTargetRole(event.target.value as 'MANAGER' | 'VIEWER')}><option value="VIEWER">VIEWER</option><option value="MANAGER">MANAGER</option></select></label></div>
            <div className="scenario-grid"><button type="button" className="scenario-card" disabled={Boolean(busyAction)} onClick={() => void runAuthorizationTest('non-member')}><span className="scenario-icon">↗</span><strong>Non-member reads another business</strong><small>Expected 403 · Requires a different business ID</small><span className="scenario-run">Run check →</span></button><button type="button" className="scenario-card" disabled={Boolean(busyAction)} onClick={() => void runAuthorizationTest('viewer-write')}><span className="scenario-icon">◌</span><strong>VIEWER attempts a business update</strong><small>Expected 403 · Confirms before sending PUT</small><span className="scenario-run">Run check →</span></button><button type="button" className="scenario-card" disabled={Boolean(busyAction)} onClick={() => void runAuthorizationTest('manager-owner')}><span className="scenario-icon">⌁</span><strong>MANAGER attempts member admin</strong><small>Expected 403 · Confirms before trying membership change</small><span className="scenario-run">Run check →</span></button><button type="button" className="scenario-card" disabled={Boolean(busyAction)} onClick={() => void runAuthorizationTest('owner-allowed')}><span className="scenario-icon">✓</span><strong>OWNER adds a member</strong><small>Expected 200 · Changes membership with confirmation</small><span className="scenario-run">Run check →</span></button><button type="button" className="scenario-card" disabled={Boolean(busyAction)} onClick={() => void runAuthorizationTest('unverified')}><span className="scenario-icon">✳</span><strong>Unverified account is blocked</strong><small>Expected 403 · Requires a signed-in unverified Firebase account</small><span className="scenario-run">Run check →</span></button></div>
            <div className="unsupported-note"><span>i</span><p>Ownership transfer and removing/demoting an OWNER are unsupported by the backend. A role scenario is Inconclusive until its required account, membership, verification state, or test data is available.</p></div>
          </section>

          <section id="results" className="panel results-panel">
            <div className="section-heading"><div><p className="eyebrow">06 / EVIDENCE</p><h2>Test results</h2></div><div className="results-actions"><button className="button button-outline" type="button" disabled={Boolean(busyAction)} onClick={() => void runAllSafeTests()}>Run safe checks</button><button className="text-button" type="button" disabled={results.length === 0} onClick={() => setResults([])}>Clear</button></div></div>
            <p className="section-subtitle">Run all includes only reads and a missing-token check. Every write or membership change asks for confirmation and stays out of the batch.</p>
            <div className="safe-check-list">{safeTestNames.map((name) => <div key={name}><span className="safe-check-icon">✓</span><span>{name}</span><button type="button" disabled={Boolean(busyAction)} onClick={() => void executeSafeTest(name)}>Run ↗</button></div>)}</div>
            {results.length ? <div className="results-table-wrap"><table><thead><tr><th>TEST</th><th>EXPECTED</th><th>ACTUAL</th><th>RESULT</th><th>DETAIL</th><th></th></tr></thead><tbody>{results.map((result) => <tr key={result.id}><td>{result.name}</td><td>{result.expected}</td><td>{result.actual}</td><td><span className={`outcome ${result.outcome.toLowerCase()}`}>{result.outcome}</span></td><td>{result.details}</td><td>{result.request && <button className="row-link" type="button" onClick={() => setInspector({ request: result.request })}>Inspect</button>}{result.rerun && <button className="row-link" type="button" onClick={result.rerun}>Rerun</button>}</td></tr>)}</tbody></table></div> : <div className="empty-results"><span>◎</span><strong>No requests yet</strong><p>Run a check to see its real HTTP result here.</p></div>}
          </section>

          <section className="panel inspector-panel">
            <div className="section-heading"><div><p className="eyebrow">REQUEST / RESPONSE</p><h2>Inspector</h2></div><span className="endpoint-tag">SENSITIVE VALUES REDACTED</span></div>
            {inspector.request ? <><div className="request-meta"><span className="method-badge">{inspector.request.method}</span><code>{inspector.request.url}</code><span className="duration">{inspector.request.durationMs} ms</span><span className="http-status">HTTP {inspector.request.status}</span></div><div className="inspector-grid"><div><div className="code-label">REQUEST HEADERS</div><pre>{JSON.stringify(inspector.request.headers, null, 2)}</pre><div className="code-label">REQUEST BODY</div><pre>{describeBody(inspector.request.requestBody)}</pre></div><div><div className="code-label">RESPONSE BODY</div><pre>{describeBody(inspector.request.body)}</pre><button className="text-button copy-button" type="button" onClick={() => void navigator.clipboard.writeText(`${inspector.request?.method} ${inspector.request?.url}\nHTTP ${inspector.request?.status}\n${describeBody(inspector.request?.body)}`)}>Copy sanitized summary</button></div></div></> : <div className="empty-inspector">{inspector.error ? <><strong>No HTTP response</strong><p>{inspector.error}</p><small>Errors before a response are not marked as Passed or Failed.</small><br /><button className="text-button copy-button" type="button" onClick={() => void navigator.clipboard.writeText(`No HTTP response. ${inspector.error}`)}>Copy sanitized error</button></> : <><strong>Waiting for a request</strong><p>The last request and response will appear here with authorization redacted.</p></>}</div>}
          </section>
          <footer className="page-footer"><span>SOHO SUITE <i>·</i> API WORKBENCH</span><span>Use Firebase test accounts and non-production test data.</span></footer>
        </div>
      </div>
    </main>
  )
}

export default function App() {
  return new URLSearchParams(window.location.search).get('tools') === 'integration'
    ? <IntegrationDashboard />
    : <WorkspaceApp />
}
