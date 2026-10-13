import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Configuration Firebase officielle pour la Commune d'Ouled Teima.
 * Projet : commune-d-ouled-teima
 */
const env = (import.meta as unknown as { env?: Record<string, string> })?.env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyB0DwcajJ1CuK4lsFGXKOuboah6H533jSI",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "commune-d-ouled-teima.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "commune-d-ouled-teima",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "commune-d-ouled-teima.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "657734554427",
  appId: env.VITE_FIREBASE_APP_ID || "1:657734554427:web:741ee57d231fa06a911d1e",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-SKVQ4D2STC",
};

// Initialisation du SDK Firebase
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialisation de Firebase Authentication
export const auth = getAuth(app);

// Initialisation de Firestore Database
export const db = getFirestore(app);

// Initialisation de Cloud Storage
export const storage = getStorage(app);

// Test de connectivité Firestore
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Vérification de connexion Firebase: client hors-ligne.');
    }
  }
}

// Enumération des types d'opérations Firestore
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default app;
