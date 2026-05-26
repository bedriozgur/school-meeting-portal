# School Meeting Portal

React + Vite + TypeScript mocked MVP for the parent meeting flow.

## Run Locally

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```

Security rules tests:

```bash
npm run test:rules
```

## Environment

Copy `.env.example` to `.env.local` for local overrides.

Required Firebase variables for future Firestore mode:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_DATA_SOURCE`

## Data Source Modes

Mock mode is the default. If `VITE_DATA_SOURCE` is missing or set to `mock`, the app uses the current mocked parent-flow repositories:

```bash
VITE_DATA_SOURCE=mock
```

Firestore mode uses read-only repository implementations:

```bash
VITE_DATA_SOURCE=firestore
```

In Firestore mode, Firebase client setup safely returns `null` when required environment variables are missing. Repository calls surface missing configuration through typed repository errors, which routes catch and show through existing i18n-backed error states.

## Repository Pattern

The UI routes do not import mocked data directly. They call repository interfaces from `src/repositories/interfaces.ts` through `src/repositories/index.ts`.

Domain models live in `src/domain/models.ts`:

- `School`
- `MeetingEvent`
- `Student`
- `Teacher`
- `TeacherAssignment`
- `ParentMeetingView`

Mock repositories live in `src/repositories/mock`:

- `mockMeetingRepository.ts`
- `mockStudentRepository.ts`
- `mockParentMeetingRepository.ts`
- `mockData.ts`

Firestore placeholder repositories live in `src/repositories/firestore`:

- `firestoreMeetingRepository.ts`
- `firestoreStudentRepository.ts`
- `firestoreParentMeetingRepository.ts`

Firebase client setup lives in `src/lib/firebase`:

- app initialization
- Firestore export
- Auth export
- missing environment variable handling

## Future Firestore Replacement

Keep route and component code dependent on repository interfaces. Firestore read repositories are implemented behind the same interfaces and are selected with:

```bash
VITE_DATA_SOURCE=firestore
```

The app still defaults to mock mode when `VITE_DATA_SOURCE` is missing.

Firestore collections used:

- `schools`
- `events`
- `students`
- `teachers`
- `classes`
- `meetingAssignments`

Seed sample:

- `docs/firestore-seed-sample.md`

Security rules documentation:

- `docs/security-rules.md`

No admin writes or authentication are implemented yet.

## Firestore Emulator Rules Tests

The rules tests use Firebase Emulator Suite plus `@firebase/rules-unit-testing`. Current `firebase-tools` requires JDK 21 or newer to start the emulator.

Install dependencies:

```bash
npm install
```

Run the rules tests:

```bash
npm run test:rules
```

The script starts the Firestore emulator through `firebase emulators:exec` and runs:

```bash
vitest run tests/firestore.rules.test.ts
```

These tests prove the current public read model for:

- active/draft event reads
- denied old/archived event reads
- denied public writes
- denied direct student and assignment document gets
- limited student lookup queries
- limited meeting assignment lookup queries
- supporting `get` reads for schools, classes, and teachers

These tests do not prove full accountless parent authorization. Firestore rules cannot perfectly verify cross-query event/student/class relationships or prevent all enumeration attempts. See `docs/security-rules.md` for the remaining risks and future hardening plan.
