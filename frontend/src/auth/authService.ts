import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../firebase'

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider())
  return credential.user
}

export async function sendVerificationEmail(): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('You must be signed in to send a verification email.')
  }
  await sendEmailVerification(user)
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

export async function getIdToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('You must be signed in to get an ID token.')
  }
  return await user.getIdToken()
}

export function getCurrentFirebaseUser(): User | null {
  return auth.currentUser
}
