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
- `VITE_ADMIN_EMAILS`
- `VITE_STAFF_ACCESS_CODE`

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

Firestore read repositories live in `src/repositories/firestore`:

- `firestoreMeetingRepository.ts`
- `firestoreStudentRepository.ts`
- `firestoreParentMeetingRepository.ts`

Firebase client setup lives in `src/lib/firebase`:

- app initialization
- Firestore export
- Auth export
- missing environment variable handling

## Admin Authentication

The admin foundation uses Firebase Auth with Google sign-in. It supports both temporary email allowlist access and Firebase custom-claim admin access. It does not include admin CRUD or staff portal behavior yet.

Configure admin access in `.env.local`:

```bash
VITE_ADMIN_EMAILS=admin@example.com,second-admin@example.com
```

Signed-in Google users can access `/admin` when either:

- their email appears in `VITE_ADMIN_EMAILS`
- their Firebase ID token has custom claim `admin: true`

Firestore admin writes require the custom claim. `VITE_ADMIN_EMAILS` is UI-only and is not sufficient for Firestore writes.

Admin routes:

- `/admin/login`
- `/admin`

Firebase setup notes:

- Enable Google as a sign-in provider in Firebase Authentication.
- Add the local development domain to Firebase Auth authorized domains if needed.
- Keep `VITE_DATA_SOURCE=mock` unless explicitly testing Firestore reads.
- Firebase client environment variables are public Vite variables by design; authorization must not rely on hidden client secrets.

Admin auth documentation:

- `docs/admin-auth.md`

## Admin Shell Status

Protected admin pages now use a shared `AdminLayout` with navigation for:

- Dashboard
- Events
- Students
- Teachers
- Classes
- Import
- QR Codes
- Staff

Implemented admin pages:

- `/admin`: placeholder dashboard
- `/admin/events`: read-only event list from the repository layer
- `/admin/events/:eventId`: read-only event detail and parent preview targets
- `/admin/events/new`: draft event creation form
- `/admin/events/:eventId/edit`: event draft-fields edit form
- `/admin/events/:eventId/duplicate`: duplicate event draft form
- `/admin/events/:eventId/assignments`: draft event teacher assignment management
- `/admin/students`: student master data list
- `/admin/students/new`: student create form
- `/admin/students/:studentId/edit`: student edit form
- `/admin/teachers`: teacher master data list
- `/admin/teachers/new`: teacher create form
- `/admin/teachers/:teacherId/edit`: teacher edit form
- `/admin/classes`: class master data list
- `/admin/classes/new`: class create form
- `/admin/classes/:classId/edit`: class edit form
- `/admin/import`: teacher, class, and student CSV/XLSX import foundation
- `/admin/pilot-checklist`: read-only pilot readiness checklist

The `/admin` dashboard now also includes a compact pilot readiness summary card that links directly to the full checklist.

Placeholder protected pages:

- `/admin/import`
- `/admin/qr`
- `/admin/staff`

## Staff Portal Status

The front desk staff portal is now available at:

- `/staff/login`
- `/staff`

The current login model is temporary and local to the browser:

- a staff access code is read from `VITE_STAFF_ACCESS_CODE`
- if that environment variable is missing, the app falls back to a local placeholder code for development
- staff sessions are stored locally in the browser and do not use Firebase Auth yet

The staff dashboard is read-only and supports:

- viewing active and draft events
- searching and selecting an event
- displaying the meeting QR target
- searching a student by school number
- displaying the student support QR target

This is separate from the admin placeholder route at `/admin/staff`, which remains an admin-side staging page for now.

## Pilot Checklist

The pilot checklist at `/admin/pilot-checklist` is a read-only operational check before launch. It shows:

- whether Firebase config is present
- whether the app is in mock or Firestore data mode
- whether active events exist
- readiness status for each active and draft event
- counts for teachers, classes, students, and assignments
- whether the QR page and import workflows are available
- whether the staff portal has a non-default local access code configured
- the current admin auth model

The page is meant to make configuration gaps visible before a pilot rollout. It does not change data.

Future Firebase direction:

- replace the local access code with Firebase staff authentication
- gate staff access with a real staff role or claim
- keep the current staff dashboard UI and repository reads as the base flow

Event create/edit forms support event name, date, start/end time, and included classes. Meeting code is generated for new events and status remains managed by lifecycle actions.

Meeting code generation uses the `ABC-123` format. New and duplicated events ask the active `MeetingRepository` whether a generated code is available and retry with a safe limit before failing. Existing event edits preserve the current meeting code.

Event duplication is available from the event list and event detail page. The duplicate flow creates a new draft event with a new unique meeting code, copies included classes, and pre-fills start/end time from the source event. The admin must confirm the new event name and date before saving. In mock mode, duplication is simulated in memory. In Firestore mode, duplication creates a new `events` document and copies source `meetingAssignments` to the new `eventId`. Parent notes are not duplicated because they are stored only in browser storage.

Teacher assignment management is available for draft events. Admins can add, edit, remove, and toggle availability for event assignments with class, teacher, subject, building, floor, and classroom fields. Active, old, and archived event assignment pages are read-only. The form prevents duplicate class/teacher/subject rows for the same event.

Assignment data is handled through dedicated repositories:

- `TeacherRepository.listTeachers()`
- `AssignmentRepository.listEventAssignments(eventId)`
- `AssignmentRepository.createEventAssignment(input)`
- `AssignmentRepository.updateEventAssignment(assignmentId, input)`
- `AssignmentRepository.deleteEventAssignment(assignmentId)`

Mock mode writes assignments in memory. Firestore mode writes to `meetingAssignments`, preserving `schoolId` and `eventId`, and sets `createdAt`/`updatedAt` timestamps. Firestore rules require `admin: true` for these writes.

Teacher, class, and student master data support minimal create/edit CRUD. Teacher forms manage full name, default subject, and active status. Class forms manage class name, grade, optional class teacher, and active status. Student forms manage school number, full name, required class, and active status. Firestore mode reads/writes `teachers`, `classes`, and `students`; mock mode uses the existing mocked records plus in-memory creates and updates. Active status defaults to active when existing documents do not define `isActive`.

Teacher writes use:

- `TeacherRepository.getTeacherById(teacherId)`
- `TeacherRepository.createTeacher(input)`
- `TeacherRepository.updateTeacher(teacherId, input)`

Firestore teacher creates include `schoolId`, `createdAt`, and `updatedAt`; updates set `updatedAt`. Existing Firestore rules require `admin: true` for teacher writes.

Class writes use:

- `ClassRepository.getClassById(classId)`
- `ClassRepository.createClass(input)`
- `ClassRepository.updateClass(classId, input)`

Firestore class creates include `schoolId`, nullable `classTeacherId`, `createdAt`, and `updatedAt`; updates set nullable `classTeacherId` and `updatedAt`. Existing Firestore rules require `admin: true` for class writes.

Student writes use:

- `StudentRepository.getStudentById(studentId)`
- `StudentRepository.createStudent(input)`
- `StudentRepository.updateStudent(studentId, input)`

Student school numbers are validated as unique within the configured school. Edits allow the current student to keep the same school number. Firestore student creates include `schoolId`, `classId`, `createdAt`, and `updatedAt`; updates set `classId` and `updatedAt`. Existing Firestore rules require `admin: true` for student writes.

Teacher, class, and student imports share reusable parsing, upload, validation summary, message, preview, and confirmation components under `src/features/imports/`. Each import keeps its own row validation and repository mapping in the admin import route so future assignment import can reuse the same flow without changing existing behavior.

Teacher import is available at `/admin/import` for CSV and XLSX files.

Required teacher import columns:

- `fullName`: required, whitespace-only values are invalid
- `defaultSubject`: optional
- `isActive`: optional, defaults to true

Example CSV:

```csv
fullName,defaultSubject,isActive
Ayşe Demir,Türkçe,true
Mehmet Kaya,Matematik,true
Geçici Öğretmen,,false
```

The import page parses the file locally, shows a validation preview, separates valid rows from errors/warnings, then imports only after admin confirmation. Duplicate `fullName` rows in the uploaded file produce warnings. Repository import uses `TeacherRepository.bulkUpsertTeachers(inputs)` and matches existing teachers by normalized full name within the configured school. Mock mode updates in memory. Firestore mode creates or updates `teachers` documents and stores `normalizedFullName` for future matching.

Class import is also available at `/admin/import` for CSV and XLSX files.

Required class import columns:

- `className`: required, whitespace-only values are invalid
- `grade`: required, whitespace-only values are invalid
- `classTeacher`: optional, matched by teacher full name
- `isActive`: optional, defaults to true

Example CSV:

```csv
className,grade,classTeacher,isActive
7-B,7,Ayşe Demir,true
6-A,6,Mehmet Kaya,true
5-C,5,,false
```

Class import validates teacher names against the current teacher repository. If `classTeacher` is provided but no matching teacher full name exists, the row shows a warning and imports with an empty class teacher. Duplicate `className` rows in the uploaded file produce warnings. Repository import uses `ClassRepository.bulkUpsertClasses(inputs)` and matches existing classes by normalized class name within the configured school. Mock mode updates in memory. Firestore mode creates or updates `classes` documents, stores `normalizedClassName`, and stores `classTeacherId` or `null`.

Student import is also available at `/admin/import` for CSV and XLSX files.

Required student import columns:

- `schoolNumber`: required, whitespace-only values are invalid
- `fullName`: required, whitespace-only values are invalid
- `className`: required, must match an existing class name
- `isActive`: optional, defaults to true

Example CSV:

```csv
schoolNumber,fullName,className,isActive
2458,Ada Yıldırım,7-B,true
1934,Efe Aydın,6-A,true
3001,Deniz Kaya,7-B,false
```

Student import validates `className` against the current class repository. Unmatched class names are errors and those rows are not importable. Duplicate `schoolNumber` rows in the uploaded file produce warnings. Repository import uses `StudentRepository.bulkUpsertStudents(inputs)` and matches existing students by school number within the configured school. Mock mode updates in memory. Firestore mode creates or updates `students` documents, stores `normalizedSchoolNumber`, and stores `classId`.

Assignment import is also available at `/admin/import` for CSV and XLSX files.

Required assignment import columns:

- `eventCode`: required, must match an existing event meeting code
- `className`: required, must match an existing class and be included in the matched event
- `teacherName`: required, must match an existing teacher
- `subject`: required
- `building`: required
- `floor`: required
- `classroom`: required
- `isAvailable`: optional, defaults to true

Example CSV:

```csv
eventCode,className,teacherName,subject,building,floor,classroom,isAvailable
BAHAR2026,7-B,Ayşe Demir,Türkçe,A,1,A-104,true
BAHAR2026,6-A,Mehmet Kaya,Matematik,A,1,A-108,true
BAHAR2026,7-B,Elif Yılmaz,Fen Bilimleri,A,2,A-203,false
```

Assignment import validates the event, class, and teacher lookups before import. Rows are rejected when the event code does not match an existing event, the class does not exist, the teacher does not exist, or the class is not included in the matched event. Duplicate event/class/teacher/subject rows produce warnings and are deduped in the bulk upsert path. Repository import uses `AssignmentRepository.bulkUpsertEventAssignments(inputs)` and matches existing assignments by event ID, class ID, teacher ID, and normalized subject within the configured school. Mock mode updates in memory. Firestore mode creates or updates `meetingAssignments` documents, stores `eventId`, `schoolId`, `classId`, `teacherId`, `subject`, `building`, `floor`, `classroom`, and `isAvailable`, and sets `createdAt`/`updatedAt`.

Each import section on `/admin/import` also includes a CSV template download button. The template metadata is centralized in `src/features/imports/importTemplates.ts`, and the exported files are UTF-8 encoded with a BOM so Turkish characters open correctly in spreadsheet apps. Each template includes one example row.

The `/admin/qr` page generates PNG QR codes for the main portal, each meeting event, and an optional student support link. The student support QR is generated from a selected event plus a school number, and every QR card shows the exact target URL.

The QR page also supports bulk meeting-code print/export. Admins can select one or more active/draft events, print the selected set, or use the one-click action to print all active/draft meeting QR codes. The printed cards include school branding, event metadata, QR code, target URL, and a short scan instruction, and the print layout is white and page-break friendly.

The event detail page shows event metadata, parent meeting URL target, preview link target, QR target text, and a read-only teacher assignment overview. The parent preview action links to the existing `/meeting/:meetingCode` route and does not enable a separate preview mode yet.

In mock mode, the admin event list includes draft, active, old, and archived examples. In Firestore mode, all event statuses are available to authenticated users with the `admin: true` custom claim.

Event lifecycle status management is the first admin write flow. Valid transitions are:

- draft to active
- draft to archived
- active to old
- active to archived
- old to archived
- archived to draft

The UI shows only valid lifecycle actions for the current event status and asks for confirmation before running an action. Mock mode simulates the transition in memory. Firestore mode updates `events/{eventId}.status` and `updatedAt`; Firestore rules require `admin: true` for that write.

Draft event activation now has readiness guardrails. Before `draft` can move to `active`, the repository validates that:

- the event has at least one included class
- every included class has at least one assignment
- every assignment has teacher, subject, building, floor, and classroom
- every assignment references an active teacher
- every included class is active

Readiness status is shown on the event detail page and event assignment page. Activation is disabled when readiness has errors. Archive, mark old, and restore behavior is unchanged. Warnings can flag unavailable teachers, classes with only one assignment, and included classes without a visible class teacher.

## Branding And Theme Presets

The v1 branding system is preset-based and intentionally not a free-form theme editor.

Theme presets live in `src/theme/presets.ts`:

- `tedRed`
- `modernBlue`
- `academicGreen`
- `navy`
- `warmNeutral`
- `burgundy`

Each preset defines:

- `primary`
- `primaryHover`
- `secondary`
- `background`
- `surface`
- `text`
- `mutedText`
- `border`
- `success`
- `warning`
- `danger`

The default school branding config lives in `src/theme/branding.ts`. It supports:

- `schoolName`
- `schoolShortName`
- `logoUrl`
- `logoInitials`
- `welcomeTitle`
- `welcomeSubtitle`
- `themePreset`
- `primaryAccent`

Visible text values in the branding config are stored as i18n keys, not literal UI strings. The active theme is applied through CSS variables by `src/theme/ThemeProvider.tsx`.

A future admin UI should offer a controlled preset selector that writes only `themePreset`, optional `primaryAccent`, and approved branding fields. It should not expose arbitrary color editing in v1.

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

Admin custom-claim-ready rules are implemented. Admin CRUD screens are not implemented yet.

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
