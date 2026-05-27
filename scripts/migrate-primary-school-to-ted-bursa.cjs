#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const admin = require("firebase-admin");

const OLD_SCHOOL_ID = "atatürk-ortaokulu";
const NEW_SCHOOL_ID = "ted-bursa";
const SCHOOL_DATA = {
  name: "TED Bursa Koleji",
  shortName: "TED Bursa",
  logoInitials: "TED",
  isActive: true,
  themePreset: "burgundy",
};
const COLLECTIONS_TO_REMAP = [
  "events",
  "teachers",
  "classes",
  "students",
  "teachingAssignments",
  "eventTeacherSetups",
];

async function main() {
  ensureGoogleCredentials();
  ensureFirebaseAdminInitialized();

  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  console.log("Starting primary school migration");
  console.log(`Source school: ${OLD_SCHOOL_ID}`);
  console.log(`Target school: ${NEW_SCHOOL_ID}`);

  await upsertTargetSchool(db, now);

  const summary = [];
  for (const collectionName of COLLECTIONS_TO_REMAP) {
    summary.push(
      await remapSchoolIdForCollection(db, collectionName, OLD_SCHOOL_ID, NEW_SCHOOL_ID),
    );
  }

  summary.push(
    await remapSchoolUsers(db, OLD_SCHOOL_ID, NEW_SCHOOL_ID, now),
  );

  await deleteOldSchool(db);

  console.log("");
  console.log("Migration summary:");
  summary.forEach((entry) => {
    console.log(`- ${entry.collection}: ${entry.updated} documents updated`);
  });
  const schoolUsersSummary = summary[summary.length - 1];
  console.log(`- schoolUsers: ${schoolUsersSummary.updated} documents rewritten`);
  console.log(`- school deleted: schools/${OLD_SCHOOL_ID}`);
  console.log(`- school created/updated: schools/${NEW_SCHOOL_ID}`);
  console.log("Migration complete.");
}

function ensureGoogleCredentials() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    fail(
      "GOOGLE_APPLICATION_CREDENTIALS is required. Point it at a Firebase service account JSON file before running the migration.",
    );
  }

  const resolvedPath = path.resolve(credentialsPath);

  if (!fs.existsSync(resolvedPath)) {
    fail(
      `GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${resolvedPath}`,
    );
  }
}

function ensureFirebaseAdminInitialized() {
  if (admin.apps.length > 0) {
    return;
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function upsertTargetSchool(db, now) {
  const schoolRef = db.collection("schools").doc(NEW_SCHOOL_ID);
  const existingSnapshot = await schoolRef.get();

  console.log(
    existingSnapshot.exists
      ? `Updating existing school document: schools/${NEW_SCHOOL_ID}`
      : `Creating school document: schools/${NEW_SCHOOL_ID}`,
  );

  await schoolRef.set(
    {
      ...SCHOOL_DATA,
      updatedAt: now,
      createdAt: existingSnapshot.exists
        ? existingSnapshot.data()?.createdAt ?? now
        : now,
    },
    { merge: false },
  );
}

async function remapSchoolIdForCollection(db, collectionName, oldSchoolId, newSchoolId) {
  const snapshot = await db
    .collection(collectionName)
    .where("schoolId", "==", oldSchoolId)
    .get();

  if (snapshot.empty) {
    console.log(`No documents to migrate in ${collectionName}`);
    return { collection: collectionName, updated: 0 };
  }

  await commitInBatches(
    db,
    snapshot.docs.map((document) => ({
      type: "update",
      ref: document.ref,
      data: { schoolId: newSchoolId },
    })),
  );

  console.log(
    `Updated ${snapshot.size} document(s) in ${collectionName} from ${oldSchoolId} to ${newSchoolId}`,
  );

  return { collection: collectionName, updated: snapshot.size };
}

async function remapSchoolUsers(db, oldSchoolId, newSchoolId, now) {
  const snapshot = await db
    .collection("schoolUsers")
    .where("schoolId", "==", oldSchoolId)
    .get();

  if (snapshot.empty) {
    console.log("No documents to migrate in schoolUsers");
    return { collection: "schoolUsers", updated: 0 };
  }

  const operations = [];
  for (const document of snapshot.docs) {
    const data = document.data();
    const uid =
      typeof data.uid === "string" && data.uid.trim()
        ? data.uid.trim()
        : inferUidFromSchoolUserId(document.id, oldSchoolId);

    if (!uid) {
      fail(
        `Unable to migrate schoolUsers/${document.id} because it is missing uid and the uid cannot be inferred from the document ID.`,
      );
    }

    const nextId = `${newSchoolId}_${uid}`;
    operations.push({
      type: "set",
      ref: db.collection("schoolUsers").doc(nextId),
      data: {
        ...data,
        schoolId: newSchoolId,
        uid,
        updatedAt: now,
        createdAt: data.createdAt ?? now,
      },
    });
    operations.push({
      type: "delete",
      ref: document.ref,
    });
  }

  await commitInBatches(db, operations);

  console.log(
    `Rewrote ${snapshot.size} schoolUsers document(s) from ${oldSchoolId} to ${newSchoolId}`,
  );

  return { collection: "schoolUsers", updated: snapshot.size };
}

function inferUidFromSchoolUserId(documentId, oldSchoolId) {
  const prefix = `${oldSchoolId}_`;

  if (!documentId.startsWith(prefix)) {
    return "";
  }

  return documentId.slice(prefix.length).trim();
}

async function deleteOldSchool(db) {
  const oldSchoolRef = db.collection("schools").doc(OLD_SCHOOL_ID);
  const snapshot = await oldSchoolRef.get();

  if (!snapshot.exists) {
    console.log(`Old school document already absent: schools/${OLD_SCHOOL_ID}`);
    return;
  }

  await oldSchoolRef.delete();
  console.log(`Deleted old school document: schools/${OLD_SCHOOL_ID}`);
}

async function commitInBatches(db, operations) {
  let batch = db.batch();
  let operationCount = 0;

  for (const operation of operations) {
    if (operationCount === 450) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }

    if (operation.type === "update") {
      batch.update(operation.ref, operation.data);
    } else if (operation.type === "set") {
      batch.set(operation.ref, operation.data, { merge: false });
    } else if (operation.type === "delete") {
      batch.delete(operation.ref);
    }

    operationCount += 1;
  }

  if (operationCount > 0) {
    await batch.commit();
  }
}

function fail(message) {
  console.error(`Migration failed: ${message}`);
  process.exit(1);
}

main().catch((error) => {
  console.error("Migration failed with an unexpected error.");
  console.error(error?.stack ?? error);
  process.exit(1);
});
