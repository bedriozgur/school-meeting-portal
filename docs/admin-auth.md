# Admin Authentication

## Current Model

The app supports several admin authorization signals:

- temporary client-side email allowlist with `VITE_ADMIN_EMAILS`
- Firebase Auth custom claim `superAdmin: true`
- Firebase Auth custom claim `admin: true` for legacy pilot compatibility
- Firestore `schoolUsers` role documents for school-scoped access

The login method does not determine permissions. The UI allows access to protected admin routes when any supported authorization signal is present.

## Temporary Email Allowlist

Configure local allowlist access in `.env.local`:

```bash
VITE_ADMIN_EMAILS=admin@example.com,second-admin@example.com
```

This is a temporary convenience for early development. It is client-side and public because Vite exposes `VITE_` variables to the browser.

The allowlist is not sufficient for Firestore admin writes.

## Production Custom Claims

Production platform-wide admin authorization should use Firebase custom claims:

```json
{
  "superAdmin": true
}
```

Legacy pilot compatibility can continue to use:

```json
{
  "admin": true
}
```

Firestore rules trust `request.auth.token.superAdmin == true` for platform-wide access and continue to support `request.auth.token.admin == true` temporarily for the pilot.

## Example Admin SDK Claim Setup

Run this from a trusted server or one-off Admin SDK script, never from the browser:

```ts
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({
  credential: cert("service-account.json"),
});

await getAuth().setCustomUserClaims("USER_UID", {
  superAdmin: true,
});
```

After setting a claim, the user must refresh their ID token. Signing out and signing back in is the simplest manual path during development.

## What The App Exposes

`useAuth()` exposes:

- `isAdmin`
- `isSuperAdmin`
- `isLegacyAdmin`
- `isAllowlistedAdmin`
- `hasAdminClaim`
- `authLoading`
- `uid`
- `email`
- `authProviderId`
- `user`
- `signInWithGoogle`
- `signInWithEmailAndPassword`
- `signOut`

`isAdmin` remains the legacy UI-level admin flag for the pilot allowlist and global admin claims. School-scoped authorization is resolved separately through `useSchoolAuthorization()`.

## Firestore Access

Firestore rules now support:

- `superAdmin: true` for full platform access
- `admin: true` for legacy pilot compatibility
- `schoolUsers` role documents for school-scoped admin and staff access

This means:

- allowlisted users can access the admin shell UI
- allowlisted users without an admin claim still cannot perform Firestore writes
- super admins can read and write all managed collections
- legacy admins can continue using the pilot access model
- school admins and staff are authorized through `schoolUsers` documents

## Future Hardening

- remove `VITE_ADMIN_EMAILS`
- require custom claims for all admin UI access
- add staff-specific custom claims separately
- add server-side audit logging for admin writes
- add claim refresh handling after role changes
