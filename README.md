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

## Pilot School

The current primary pilot school is **TED Bursa Koleji**.

- Default school ID: `ted-bursa`
- Multi-school authorization remains available in the codebase for later rollout
- The school selector is hidden for the pilot unless a super admin has more than one active school to manage

## Admin Authentication

The admin foundation uses Firebase Auth with Google sign-in and email/password sign-in. Authentication is separate from authorization. Access can come from a temporary email allowlist, a legacy `admin: true` claim, a platform-wide `superAdmin: true` claim, or school role records in Firestore. It does not include full multi-school CRUD yet.

Configure admin access in `.env.local`:

```bash
VITE_ADMIN_EMAILS=admin@example.com,second-admin@example.com
```

Signed-in admin users can access `/admin` when either:

- their email appears in `VITE_ADMIN_EMAILS`
- their Firebase ID token has custom claim `admin: true`
- their Firebase ID token has custom claim `superAdmin: true`
- they have a `schoolUsers` role record for the selected school

The admin header shows the current school. Super admins can switch the selected school from the admin shell when more than one active school exists; the dashboard, pilot checklist, and list views use that selection where practical. The default-school pilot behavior remains the fallback when no selection is present.

`VITE_ADMIN_EMAILS` is UI-only and is not sufficient for Firestore writes.
Firestore writes depend on authorization:

- `superAdmin: true` can access all managed collections
- legacy `admin: true` remains supported for the pilot
- school-scoped records in `schoolUsers` control access to the current school

The admin shell can read and update the selected school's role records at `/admin/school-users`.

Admin routes:

- `/admin/login`
- `/admin`
- `/admin/school-users`

Firebase setup notes:

- Enable Google as a sign-in provider in Firebase Authentication.
- Add the local development domain to Firebase Auth authorized domains if needed.
- Keep `VITE_DATA_SOURCE=mock` unless explicitly testing Firestore reads.
- Firebase client environment variables are public Vite variables by design; authorization must not rely on hidden client secrets.

Admin auth documentation:

- `docs/admin-auth.md`

### Setting an admin custom claim locally

Use the local utility script to set the legacy `admin: true` claim on a Firebase Auth user:

```bash
node scripts/set-admin-claim.cjs user@example.com
```

The script needs Firebase Admin credentials from one of these sources:

- `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json`
- `FIREBASE_SERVICE_ACCOUNT_JSON` with the raw service account JSON payload

If you keep a downloaded service account file on disk, it should stay out of git. The repository ignores common service account filename patterns, including `*service-account*.json` and `firebase-service-account*.json`.

Notes:

- The user must already exist in Firebase Authentication.
- The script sets only `{ admin: true }`.
- Do not commit service account files or paste them into source control.

### One-time primary school migration

If you need to move the pilot data into the current TED Bursa primary school, use the migration script manually:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json \
node scripts/migrate-primary-school-to-ted-bursa.cjs
```

The script updates the `schoolId` fields across the managed collections, rewrites `schoolUsers` document IDs, updates `schools/ted-bursa`, and deletes `schools/atatürk-ortaokulu` after the migration completes.

### Email/Password admin login

The admin login page now supports both Google sign-in and email/password sign-in.
Email/password is intended for staging and pilot use when you want a manually managed Firebase Authentication user.

To enable it:

1. In Firebase Console, open Authentication > Sign-in method.
2. Enable the Email/Password provider.
3. Create the admin user manually in Authentication > Users.
4. Set the user's legacy admin custom claim with the local script above if you want that account to keep pilot/global admin access.

Important:

- `VITE_ADMIN_EMAILS` is still UI-only allowlist access.
- `VITE_ADMIN_EMAILS` does not grant Firestore write access.
- Firestore writes still require the right authorization path. For legacy pilot access, that is `admin: true`; for school-scoped access, it is the appropriate `schoolUsers` role record; for platform admins, it is `superAdmin: true`.

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

The school user management backend foundation remains in place, but the `/admin/school-users` menu item is hidden during the pilot to keep the UI focused.

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

Meeting code generation uses the `ABC-DEF` format. New and duplicated events ask the active `MeetingRepository` whether a generated code is available and retry with a safe limit before failing. Existing event edits preserve the current meeting code. Legacy numeric codes that already exist in storage still resolve for backward compatibility.

Event duplication is available from the event list and event detail page. The duplicate flow creates a new draft event with a new unique meeting code, copies included classes, and pre-fills start/end time from the source event. The admin must confirm the new event name and date before saving. In mock mode, duplication is simulated in memory. In Firestore mode, duplication creates a new `events` document and leaves teacher setup data to be entered separately. Parent notes are not duplicated because they are stored only in browser storage.

Teacher assignment management is now split into two parts:

- `teachingAssignments`: reusable school-level class/teacher links with a default subject and optional override rows
- `eventTeacherSetups`: event-specific building/floor/classroom/availability data

Admins can manage teaching assignments from the class and teacher editors. The default row uses the teacher's default subject, and an `Add another subject` action creates extra subject rows for the same class/teacher when needed. The event setup page only manages teacher location and availability for the selected event. Active, old, and archived event setup pages are read-only. The form prevents duplicate resolved class/teacher/subject rows for teaching assignments and duplicate event/teacher rows for event setups.

Assignment data is handled through dedicated repositories:

- `TeachingAssignmentRepository.listTeachingAssignmentsForClass(classId)`
- `TeachingAssignmentRepository.listTeachingAssignmentsForTeacher(teacherId)`
- `TeachingAssignmentRepository.createTeachingAssignment(input)`
- `TeachingAssignmentRepository.updateTeachingAssignment(teachingAssignmentId, input)`
- `TeachingAssignmentRepository.deleteTeachingAssignment(teachingAssignmentId)`
- `AssignmentRepository.listEventAssignments(eventId)`
- `AssignmentRepository.createEventAssignment(input)`
- `AssignmentRepository.updateEventAssignment(assignmentId, input)`
- `AssignmentRepository.deleteEventAssignment(assignmentId)`

Mock mode writes teaching assignments and event teacher setups in memory. Firestore mode writes to `teachingAssignments` and `eventTeacherSetups`, preserving `schoolId`, and sets `createdAt`/`updatedAt` timestamps. Firestore rules require either `superAdmin: true`, legacy `admin: true`, or an active matching `schoolUsers` school-admin role for these writes.

Teacher, class, and student master data support minimal create/edit CRUD. Teacher forms manage full name, default subject, and active status. Class forms manage class name, grade, optional class teacher, and active status. Student forms manage school number, full name, required class, and active status. Firestore mode reads/writes `teachers`, `classes`, and `students`; mock mode uses the existing mocked records plus in-memory creates and updates. Active status defaults to active when existing documents do not define `isActive`.

Teacher writes use:

- `TeacherRepository.getTeacherById(teacherId)`
- `TeacherRepository.createTeacher(input)`
- `TeacherRepository.updateTeacher(teacherId, input)`

Firestore teacher creates include `schoolId`, `createdAt`, and `updatedAt`; updates set `updatedAt`. Existing Firestore rules allow platform admins, legacy admins, and matching school admins to write teacher records.

Class writes use:

- `ClassRepository.getClassById(classId)`
- `ClassRepository.createClass(input)`
- `ClassRepository.updateClass(classId, input)`

Firestore class creates include `schoolId`, nullable `classTeacherId`, `createdAt`, and `updatedAt`; updates set nullable `classTeacherId` and `updatedAt`. Existing Firestore rules allow platform admins, legacy admins, and matching school admins to write class records.

Student writes use:

- `StudentRepository.getStudentById(studentId)`
- `StudentRepository.createStudent(input)`
- `StudentRepository.updateStudent(studentId, input)`

Student school numbers are validated as unique within the configured school. Edits allow the current student to keep the same school number. Firestore student creates include `schoolId`, `classId`, `createdAt`, and `updatedAt`; updates set `classId` and `updatedAt`. Existing Firestore rules allow platform admins, legacy admins, and matching school admins to write student records.

Teacher, class, student, and teaching assignment imports share reusable parsing, upload, validation summary, message, preview, and confirmation components under `src/features/imports/`. Each import keeps its own row validation and repository mapping in the admin import route so future operational workflows can reuse the same flow without changing existing behavior.

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

This section now imports reusable teaching assignments only, not event-specific location data.

Required teaching assignment import columns:

- `className`: required, must match an existing class
- `teacherName`: required, must match an existing teacher
- `subject`: optional, overrides the teacher default subject when provided
- `isActive`: optional, defaults to true

Example CSV:

```csv
className,teacherName,subject,isActive
7-B,Ayşe Demir,,true
6-A,Mehmet Kaya,Matematik,true
7-B,Elif Yılmaz,Fen Bilimleri,false
```

Teaching assignment import rejects rows when the class or teacher does not exist. Duplicate class/teacher/subject rows produce warnings and are deduped in the bulk upsert path. When `subject` is blank, the import uses the teacher's default subject; when `subject` is filled, it becomes an override for the same class/teacher pair. Repository import uses `TeachingAssignmentRepository.bulkUpsertTeachingAssignments(inputs)` and matches existing assignments by class ID, teacher ID, and normalized resolved subject within the configured school. Mock mode updates in memory. Firestore mode creates or updates `teachingAssignments` documents, stores `schoolId`, `classId`, `teacherId`, `subject`, `subjectOverride`, `isActive`, and `normalizedSubject`, and sets `createdAt`/`updatedAt`.

Event teacher setup remains a separate admin workflow and stores event-specific building, floor, classroom, and availability values in `eventTeacherSetups`.

Each import section on `/admin/import` includes two kinds of CSV download actions:

- Template downloads: empty/example formats for the import column set
- Current data exports: selected-school rows from the repository layer, ready for Excel editing and re-import

The template metadata is centralized in `src/features/imports/importTemplates.ts`, and the exported files are UTF-8 encoded with a BOM so Turkish characters open correctly in spreadsheet apps. Each template includes one example row.

Current-data CSV exports use the same column names as the templates and can be edited and re-imported after saving. Matching rules stay the same as the import flow:

- teachers by normalized full name
- classes by normalized class name
- students by normalized school number
- teaching assignments by class, teacher, and resolved subject/default-subject key

Pilot note: exporting all students is acceptable for the current school size, but a paginated or server-side export would be a better future fit for larger schools.

The `/admin/qr` page generates PNG QR codes for the main portal, each meeting event, and an optional student support link. The student support QR is generated from a selected event plus a school number, and every QR card shows the exact target URL.

The QR page also supports bulk meeting-code print/export. Admins can select one or more active/draft events, print the selected set, or use the one-click action to print all active/draft meeting QR codes. The printed cards include school branding, event metadata, QR code, target URL, and a short scan instruction, and the print layout is white and page-break friendly.

The event detail page shows event metadata, parent meeting URL target, preview link target, QR target text, and a read-only teacher assignment overview. The parent preview action links to the existing `/meeting/:meetingCode` route and does not enable a separate preview mode yet.

In mock mode, the admin event list includes draft, active, old, and archived examples. In Firestore mode, all event statuses are available to authenticated users with the appropriate admin or school-scoped authorization.

Event lifecycle status management is the first admin write flow. Valid transitions are:

- draft to active
- draft to archived
- active to old
- active to archived
- old to archived
- archived to draft

The UI shows only valid lifecycle actions for the current event status and asks for confirmation before running an action. Mock mode simulates the transition in memory. Firestore mode updates `events/{eventId}.status` and `updatedAt`; Firestore rules allow the transition for platform admins, legacy admins, and matching school admins.

Draft event activation now has readiness guardrails. Before `draft` can move to `active`, the repository validates that:

- the event has at least one included class
- every included class has at least one active teaching assignment
- every teaching assignment has a teacher and subject
- every teaching assignment references an active teacher
- every involved teacher has an event-specific setup with building, floor, and classroom
- every included class is active

Readiness status is shown on the event detail page and event assignment page. Activation is disabled when readiness has errors. Archive, mark old, and restore behavior is unchanged. Warnings can flag unavailable teachers, classes with only one assignment, and included classes without a visible class teacher.

## Branding And Theme Presets

The v1 branding system is preset-based and intentionally not a free-form theme editor.

Theme presets live in `src/theme/presets.ts`:

- `tedBursa`
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

The TED Bursa pilot theme uses the TED Bursa logo asset in `src/assets/ted-bursa-logo.png`, a light neutral background, TED blue as the primary structure color, red for actions/highlights, and yellow only as a minimal accent.

Typography is set to `Inter` across the app to keep the UI calm, readable, and more SaaS-like on mobile and desktop.

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
- `teachingAssignments`
- `eventTeacherSetups`

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
