import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { signUpWithEmail } from './auth/authService'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSignup(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const user = await signUpWithEmail(email, password)
      alert(`User created successfully: ${user.uid}`)
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Signup failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <h1>Soho Suite</h1>
      <form onSubmit={handleSignup}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing up…' : 'Sign Up'}
        </button>
      </form>
    </main>
  )
}

export default App
