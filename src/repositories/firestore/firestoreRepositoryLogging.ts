import { getIdTokenResult } from "firebase/auth";
import { getFirebaseAuth } from "../../lib/firebase";

type FirestoreAuthState = {
  uid: string | null;
  email: string | null;
  isSuperAdmin: boolean;
  isLegacyAdmin: boolean;
};

export async function logFirestoreCollectionFailure(params: {
  collectionName: string;
  operation: string;
  schoolId?: string;
  context?: Record<string, unknown>;
  error: unknown;
}) {
  if (import.meta.env.DEV !== true) {
    return;
  }

  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser ?? null;
  let authState: FirestoreAuthState | null = null;

  if (currentUser) {
    try {
      const tokenResult = await getIdTokenResult(currentUser);
      authState = {
        uid: currentUser.uid ?? null,
        email: currentUser.email ?? null,
        isSuperAdmin: tokenResult.claims.superAdmin === true,
        isLegacyAdmin: tokenResult.claims.admin === true,
      };
    } catch {
      authState = {
        uid: currentUser.uid ?? null,
        email: currentUser.email ?? null,
        isSuperAdmin: false,
        isLegacyAdmin: false,
      };
    }
  }

  console.error(`[Firestore ${params.collectionName}] ${params.operation} failed`, {
    collectionName: params.collectionName,
    operation: params.operation,
    schoolId: params.schoolId ?? null,
    context: params.context ?? null,
    errorMessage: getErrorMessage(params.error),
    errorCode: getFirebaseErrorCode(params.error),
    authState,
    error: stringifySafe(params.error),
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getFirebaseErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}

function stringifySafe(value: unknown) {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, nestedValue) => {
        if (nestedValue instanceof Error) {
          return {
            name: nestedValue.name,
            message: nestedValue.message,
            code: getFirebaseErrorCode(nestedValue),
          };
        }

        if (typeof nestedValue === "bigint") {
          return nestedValue.toString();
        }

        if (typeof nestedValue === "function") {
          return "[Function]";
        }

        return nestedValue;
      }),
    );
  } catch {
    return String(value);
  }
}
