# Admin Authentication

## Current Model

The app supports two admin authorization signals:

- temporary client-side email allowlist with `VITE_ADMIN_EMAILS`
- Firebase Auth custom claim `admin: true`

The UI allows access to protected admin routes when either signal is present.

## Temporary Email Allowlist

Configure local allowlist access in `.env.local`:

```bash
VITE_ADMIN_EMAILS=admin@example.com,second-admin@example.com
```

This is a temporary convenience for early development. It is client-side and public because Vite exposes `VITE_` variables to the browser.

The allowlist is not sufficient for Firestore admin writes.

## Production Custom Claims

Production admin authorization should use Firebase custom claims:

```json
{
  "admin": true
}
```

Firestore rules trust `request.auth.token.admin == true` for admin-managed collection reads and writes.

## Example Admin SDK Claim Setup

Run this from a trusted server or one-off Admin SDK script, never from the browser:

```ts
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({
  credential: cert("service-account.json"),
});

await getAuth().setCustomUserClaims("USER_UID", {
  admin: true,
});
```

After setting a claim, the user must refresh their ID token. Signing out and signing back in is the simplest manual path during development.

## What The App Exposes

`useAuth()` exposes:

- `isAdmin`
- `isAllowlistedAdmin`
- `hasAdminClaim`
- `authLoading`
- `user`
- `signInWithGoogle`
- `signOut`

`isAdmin` is true when either the custom claim or temporary allowlist matches.

## Firestore Access

Firestore rules only grant admin-managed collection writes to authenticated users with `admin: true`.

This means:

- allowlisted users can access the admin shell UI
- allowlisted users without the custom claim cannot perform Firestore admin writes
- custom-claim admins can read and write admin-managed collections according to `firestore.rules`

## Future Hardening

- remove `VITE_ADMIN_EMAILS`
- require custom claims for all admin UI access
- add staff-specific custom claims separately
- add server-side audit logging for admin writes
- add claim refresh handling after role changes
