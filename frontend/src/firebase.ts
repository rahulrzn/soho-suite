import { getApps, initializeApp } from "firebase/app";
import type { FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().find((existingApp) => existingApp.name === "[DEFAULT]")
  ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);

const requiredFirebaseKeys = [
  'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID',
] as const;
const configuredFirebaseValues = [
  firebaseConfig.apiKey, firebaseConfig.authDomain, firebaseConfig.projectId,
  firebaseConfig.storageBucket, firebaseConfig.messagingSenderId, firebaseConfig.appId,
];
const missingFirebaseKeys = requiredFirebaseKeys.filter((_, index) => !configuredFirebaseValues[index]?.trim());
export const firebaseConfigurationError = missingFirebaseKeys.length
  ? `Firebase configuration is missing: ${missingFirebaseKeys.join(', ')}.`
  : '';
