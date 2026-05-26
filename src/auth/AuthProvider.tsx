import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type IdTokenResult,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getFirebaseAuth } from "../lib/firebase";
import { isAdminEmail } from "./adminAllowlist";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  authLoading: boolean;
  isAdmin: boolean;
  isAllowlistedAdmin: boolean;
  hasAdminClaim: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [tokenResult, setTokenResult] = useState<IdTokenResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getFirebaseAuth();
  const isConfigured = Boolean(auth);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setTokenResult(null);
      setIsLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setTokenResult(nextUser ? await nextUser.getIdTokenResult() : null);
      setIsLoading(false);
    });
  }, [auth]);

  const value = useMemo<AuthContextValue>(
    () => {
      const isAllowlistedAdmin = isAdminEmail(user?.email);
      const hasAdminClaim = tokenResult?.claims.admin === true;

      return {
        user,
        isLoading,
        authLoading: isLoading,
        isAllowlistedAdmin,
        hasAdminClaim,
        isAdmin: isAllowlistedAdmin || hasAdminClaim,
        isConfigured,
        async signInWithGoogle() {
          if (!auth) {
            throw new Error("Firebase Auth is not configured.");
          }

          const credential = await signInWithPopup(auth, new GoogleAuthProvider());
          setTokenResult(await credential.user.getIdTokenResult(true));
        },
        async signOut() {
          if (!auth) {
            setUser(null);
            setTokenResult(null);
            return;
          }

          await firebaseSignOut(auth);
          setTokenResult(null);
        },
      };
    },
    [auth, isConfigured, isLoading, tokenResult?.claims.admin, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
