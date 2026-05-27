# Multi-School Authorization

This app separates authentication from authorization.

## Authentication

Authentication answers "who signed in?".

Supported admin sign-in methods:

- Google sign-in
- Email/password sign-in

The login method does not grant permissions by itself.

## Authorization

Authorization answers "what can this signed-in user do?".

The app currently supports three authorization layers:

- `superAdmin: true` custom claim for platform-wide administrators
- legacy `admin: true` custom claim for the v1/pilot rollout
- Firestore `schoolUsers` role documents for school-scoped access

`VITE_ADMIN_EMAILS` remains a temporary UI-only allowlist for pilot access. It helps users get into the admin shell, but it does not grant Firestore writes.

## School selection foundation

The admin shell now has a local `currentSchoolId` selection state.

- It defaults to the current pilot school so the existing single-school flow keeps working.
- Super admins and legacy admins can switch the selected school in the admin header.
- The selected school is used by the dashboard summary, pilot checklist, and school-scoped list pages where practical.
- The selector is a UI foundation only. It does not replace Firestore authorization.

## schoolUsers role documents

School-scoped authorization is stored in the Firestore `schoolUsers` collection.

Suggested document ID:

- `{schoolId}_{uid}`

Fields:

- `schoolId`
- `uid`
- `email`
- `role`: `schoolAdmin` or `staff`
- `isActive`
- `createdAt`
- `updatedAt`

## Role meanings

- `superAdmin`: platform-wide access to all schools and managed data.
- legacy `admin`: temporary global access for the pilot period.
- `schoolAdmin`: can access and manage the assigned school only.
- `staff`: can access assigned-school support workflows only.

## Future direction

Later releases should add:

- a school selector for multi-school admins
- explicit staff portals and support-scoped UI
- migration away from the legacy `admin` claim once all users have school roles or `superAdmin` claims

## Important note

The login method does not determine permissions. A Google user and an email/password user can both be either authorized or unauthorized depending on claims and `schoolUsers` records.
