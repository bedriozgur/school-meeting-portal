import { create } from "zustand";
import { persist } from "zustand/middleware";

export const STAFF_ACCESS_CODE_FALLBACK = "STAFF-PORTAL";

type StaffSessionState = {
  isAuthenticated: boolean;
  hasHydrated: boolean;
  signIn: () => void;
  signOut: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

const storageKey = "school-meeting-portal-staff-session";

export function getStaffAccessCode() {
  return import.meta.env.VITE_STAFF_ACCESS_CODE?.trim() || STAFF_ACCESS_CODE_FALLBACK;
}

export function isStaffAccessCodeValid(accessCode: string) {
  return accessCode.trim() === getStaffAccessCode();
}

export const useStaffSessionStore = create<StaffSessionState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      hasHydrated: false,
      signIn: () => set({ isAuthenticated: true }),
      signOut: () => set({ isAuthenticated: false }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: storageKey,
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<StaffSessionState> | undefined;

        return {
          ...current,
          ...persistedState,
          hasHydrated: true,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
