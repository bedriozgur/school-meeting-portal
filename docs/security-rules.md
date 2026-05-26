# Firestore Security Rules

## Current Public Read Assumptions

The current parent flow is intentionally accountless. A parent enters a meeting code and student school number, then reads the meeting view needed for that student.

No parent notes are stored in Firestore. Notes and visited state remain browser-local only.

## Why Parent Access Is Accountless

The MVP is designed for low-friction parent meeting days where parents should not need a login. Access is scoped by:

- meeting code
- active or draft event status
- student school number
- class inclusion in the event

The application repository layer performs the complete event-scoped validation.

## Publicly Readable Collections

- `events`: public read only for documents with `status` equal to `active` or `draft`, supporting meeting-code lookup.
- `students`: public list only with `limit <= 1`, supporting student-number lookup. Direct document get is denied.
- `classes`: public get only, needed after a valid student lookup to show class and grade.
- `teachers`: public get only, needed to show teacher cards and class teacher names.
- `meetingAssignments`: public list only with `limit <= 50`, needed to load teacher assignments for a class/event.
- `schools`: public get only, needed to show school context.

All public writes are denied.

## Firestore Rules Limitations

Firestore rules are not server-side filters. A query is allowed only when Firestore can prove every returned document satisfies the rule.

Rules also cannot reliably inspect every required `where` clause for this flow. That means the rules cannot perfectly enforce that:

- student queries include both `schoolNumber` and `schoolId`
- assignment queries include `eventId`, `schoolId`, and `classId`
- a student class is included in an event selected by meeting code from a previous query

The current rules reduce accidental broad reads by denying direct student and assignment document gets and requiring query limits. This is not a complete anti-enumeration control.

## Risks Remaining In V1

- A user who knows the Firebase config can attempt limited student-number enumeration.
- Assignment queries are limited but still public for the current read-only flow.
- Teacher and class documents are publicly readable by known document ID.
- Firestore composite indexes may be required for repository queries.
- There is no App Check, authentication, rate limiting, or server-side lookup token yet.

## Future Admin/Staff Auth

When admin and staff auth is added:

- Write access should require custom claims such as `admin` or `staff`.
- Staff writes should be constrained to their school and role.
- Admin UI should manage events, included classes, assignments, and teacher records.
- Security rules should validate ownership fields like `schoolId`.

The current rules include placeholder helper functions for future `admin` and `staff` custom claims, but all writes remain denied.

## Recommended Future Hardening

- Add Firebase App Check.
- Move parent lookup behind a callable function or backend endpoint.
- Replace accountless collection queries with short-lived event/student lookup tokens.
- Store public parent meeting views in denormalized event-scoped documents.
- Restructure assignments under `events/{eventId}/classes/{classId}/assignments`.
- Avoid storing sensitive student or staff data in publicly readable documents.
- Add monitoring for lookup volume and failed lookup patterns.
- Add automated rules tests with the Firebase emulator.
