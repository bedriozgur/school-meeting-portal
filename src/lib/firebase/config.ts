export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const firebaseEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

type FirebaseEnvKey = (typeof firebaseEnvKeys)[number];

function getEnvValue(key: FirebaseEnvKey): string {
  return import.meta.env[key] ?? "";
}

export function getMissingFirebaseEnvKeys(): FirebaseEnvKey[] {
  return firebaseEnvKeys.filter((key) => !getEnvValue(key));
}

export function getFirebaseClientConfig(): FirebaseClientConfig | null {
  if (getMissingFirebaseEnvKeys().length > 0) {
    return null;
  }

  return {
    apiKey: getEnvValue("VITE_FIREBASE_API_KEY"),
    authDomain: getEnvValue("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: getEnvValue("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: getEnvValue("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnvValue("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getEnvValue("VITE_FIREBASE_APP_ID"),
  };
}
