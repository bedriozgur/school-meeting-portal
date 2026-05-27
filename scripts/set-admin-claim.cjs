#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const admin = require("firebase-admin");

function printUsageAndExit(message) {
  if (message) {
    console.error(`Error: ${message}`);
    console.error("");
  }

  console.error("Usage:");
  console.error("  node scripts/set-admin-claim.cjs user@example.com");
  console.error("");
  console.error("Required credentials:");
  console.error(
    "  - GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json",
  );
  console.error("    or");
  console.error(
    "  - FIREBASE_SERVICE_ACCOUNT_JSON='{\"type\":\"service_account\",...}'",
  );
  process.exit(1);
}

function readServiceAccountConfig() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (rawJson) {
    try {
      return JSON.parse(rawJson);
    } catch (error) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but it is not valid JSON.",
      );
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credentialsPath) {
    const resolvedPath = path.resolve(credentialsPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS points to a file that does not exist: ${resolvedPath}`,
      );
    }

    try {
      const fileContents = fs.readFileSync(resolvedPath, "utf8");
      return JSON.parse(fileContents);
    } catch (error) {
      throw new Error(
        `Failed to read or parse the service account file at ${resolvedPath}.`,
      );
    }
  }

  throw new Error(
    "No Firebase service account credentials were found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.",
  );
}

async function main() {
  const email = process.argv[2]?.trim();

  if (!email || email.startsWith("-")) {
    printUsageAndExit("An admin email address is required.");
  }

  if (!email.includes("@")) {
    printUsageAndExit(`"${email}" is not a valid email address.`);
  }

  const serviceAccount = readServiceAccountConfig();

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    console.log(`Success: set admin custom claim for ${email} (${user.uid}).`);
    console.log("Claim value: { admin: true }");
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      console.error(`Error: no Firebase Auth user was found for ${email}.`);
      console.error(
        "Make sure the user has signed in at least once or exists in Firebase Authentication.",
      );
      process.exit(1);
    }

    const message = error?.message || String(error);
    console.error(`Error: failed to set the admin custom claim for ${email}.`);
    console.error(message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error: unexpected failure while setting the admin claim.");
  console.error(error?.message || String(error));
  process.exit(1);
});
