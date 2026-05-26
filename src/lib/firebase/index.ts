import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  getFirebaseClientConfig,
  getMissingFirebaseEnvKeys,
} from "./config";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestore: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = getFirebaseClientConfig();

  if (!config) {
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  }

  return firebaseApp;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(app);
  }

  return firebaseAuth;
}

export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  if (!firestore) {
    firestore = getFirestore(app);
  }

  return firestore;
}

export const missingFirebaseEnvKeys = getMissingFirebaseEnvKeys();
export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export const db = getFirebaseFirestore();
