import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SCHOOL_ID } from "../config/school";

type AdminSchoolState = {
  currentSchoolId: string;
  hasHydrated: boolean;
  setCurrentSchoolId: (schoolId: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  resetCurrentSchoolId: () => void;
};

const storageKey = "school-meeting-portal-admin-school";

export const useAdminSchoolStore = create<AdminSchoolState>()(
  persist(
    (set) => ({
      currentSchoolId: DEFAULT_SCHOOL_ID,
      hasHydrated: false,
      setCurrentSchoolId: (schoolId) =>
        set({ currentSchoolId: schoolId.trim() || DEFAULT_SCHOOL_ID }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      resetCurrentSchoolId: () => set({ currentSchoolId: DEFAULT_SCHOOL_ID }),
    }),
    {
      name: storageKey,
      partialize: (state) => ({
        currentSchoolId: state.currentSchoolId,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<AdminSchoolState> | undefined;

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
