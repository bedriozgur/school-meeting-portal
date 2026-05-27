import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "../i18n/i18n";
import { normalizeMeetingCode } from "../repositories/meetingCodes";

type TeacherState = {
  visited: boolean;
  notes: string;
};

type SessionStore = {
  language: Language;
  meetingCode: string;
  schoolNumber: string;
  expiresOn: string;
  teacherState: Record<string, TeacherState>;
  setLanguage: (language: Language) => void;
  setMeetingCode: (meetingCode: string) => void;
  setSchoolNumber: (schoolNumber: string) => void;
  setTeacherVisited: (teacherId: string, visited: boolean) => void;
  setTeacherNotes: (teacherId: string, notes: string) => void;
  resetSession: () => void;
  resetStudent: () => void;
  resetMeeting: () => void;
};

const storageKey = "school-meeting-portal-session";

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA");
}

function initialState() {
  return {
    language: "tr" as Language,
    meetingCode: "",
    schoolNumber: "",
    expiresOn: todayKey(),
    teacherState: {},
  };
}

function ensureCurrentDay(state: SessionStore): SessionStore {
  if (state.expiresOn === todayKey()) {
    return state;
  }

  return {
    ...state,
    ...initialState(),
    language: state.language,
  };
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      ...initialState(),
      setLanguage: (language) => set({ language }),
      setMeetingCode: (meetingCode) =>
        set((state) => ({
          ...ensureCurrentDay(state),
          meetingCode: normalizeMeetingCode(meetingCode),
          expiresOn: todayKey(),
        })),
      setSchoolNumber: (schoolNumber) =>
        set((state) => ({
          ...ensureCurrentDay(state),
          schoolNumber: schoolNumber.trim(),
          expiresOn: todayKey(),
        })),
      setTeacherVisited: (teacherId, visited) =>
        set((state) => {
          const current = ensureCurrentDay(state);

          return {
            ...current,
            expiresOn: todayKey(),
            teacherState: {
              ...current.teacherState,
              [teacherId]: {
                visited,
                notes: current.teacherState[teacherId]?.notes ?? "",
              },
            },
          };
        }),
      setTeacherNotes: (teacherId, notes) =>
        set((state) => {
          const current = ensureCurrentDay(state);

          return {
            ...current,
            expiresOn: todayKey(),
            teacherState: {
              ...current.teacherState,
              [teacherId]: {
                visited: current.teacherState[teacherId]?.visited ?? false,
                notes,
              },
            },
          };
        }),
      resetSession: () =>
        set((state) => ({
          ...initialState(),
          language: state.language,
        })),
      resetStudent: () =>
        set((state) => ({
          ...ensureCurrentDay(state),
          schoolNumber: "",
          teacherState: {},
          expiresOn: todayKey(),
        })),
      resetMeeting: () =>
        set((state) => ({
          ...initialState(),
          language: state.language,
        })),
    }),
    {
      name: storageKey,
      partialize: (state) => ({
        language: state.language,
        meetingCode: state.meetingCode,
        schoolNumber: state.schoolNumber,
        expiresOn: state.expiresOn,
        teacherState: state.teacherState,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<SessionStore> | undefined;
        const merged = {
          ...current,
          ...persistedState,
        } as SessionStore;

        return ensureCurrentDay(merged);
      },
    },
  ),
);
