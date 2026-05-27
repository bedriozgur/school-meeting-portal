import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const projectId = "school-meeting-portal-rules-test";
const rules = readFileSync("firestore.rules", "utf8");

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await Promise.all([
      setDoc(doc(db, "schools", "school-1"), {
        name: "Atatürk Ortaokulu",
        logoInitials: "OT",
        schoolId: "school-1",
      }),
      setDoc(doc(db, "events", "event-active"), {
        schoolId: "school-1",
        meetingCode: "ACTIVE2026",
        status: "active",
        includedClasses: ["class-7-b"],
      }),
      setDoc(doc(db, "events", "event-draft"), {
        schoolId: "school-1",
        meetingCode: "DRAFT2026",
        status: "draft",
        includedClasses: ["class-7-b"],
      }),
      setDoc(doc(db, "events", "event-old"), {
        schoolId: "school-1",
        meetingCode: "OLD2026",
        status: "old",
        includedClasses: ["class-7-b"],
      }),
      setDoc(doc(db, "events", "event-archived"), {
        schoolId: "school-1",
        meetingCode: "ARCHIVED2026",
        status: "archived",
        includedClasses: ["class-7-b"],
      }),
      setDoc(doc(db, "students", "student-2458"), {
        schoolId: "school-1",
        schoolNumber: "2458",
        fullName: "Ada Yıldırım",
        classId: "class-7-b",
      }),
      setDoc(doc(db, "teachers", "teacher-1"), {
        schoolId: "school-1",
        fullName: "Ayşe Demir",
        defaultSubject: "Türkçe",
      }),
      setDoc(doc(db, "classes", "class-7-b"), {
        schoolId: "school-1",
        name: "7-B",
        grade: "7",
        classTeacherId: "teacher-1",
      }),
      setDoc(doc(db, "teachingAssignments", "teaching-1"), {
        schoolId: "school-1",
        teacherId: "teacher-1",
        classId: "class-7-b",
        subject: "Türkçe",
        isActive: true,
      }),
      setDoc(doc(db, "eventTeacherSetups", "setup-1"), {
        eventId: "event-active",
        schoolId: "school-1",
        teacherId: "teacher-1",
        building: "A",
        floor: 1,
        classroom: "A-104",
        isAvailable: true,
      }),
    ]);
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

function publicDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function nonAdminDb() {
  return testEnv
    .authenticatedContext("non-admin-user", {
      email: "teacher@example.com",
    })
    .firestore();
}

function adminDb() {
  return testEnv
    .authenticatedContext("admin-user", {
      email: "admin@example.com",
      admin: true,
    })
    .firestore();
}

describe("events", () => {
  it("allows get and query for active events", async () => {
    const db = publicDb();

    await assertSucceeds(getDoc(doc(db, "events", "event-active")));
    await assertSucceeds(
      getDocs(
        query(
          collection(db, "events"),
          where("meetingCode", "==", "ACTIVE2026"),
          where("status", "==", "active"),
        ),
      ),
    );
  });

  it("allows get and query for draft events", async () => {
    const db = publicDb();

    await assertSucceeds(getDoc(doc(db, "events", "event-draft")));
    await assertSucceeds(
      getDocs(
        query(
          collection(db, "events"),
          where("meetingCode", "==", "DRAFT2026"),
          where("status", "==", "draft"),
        ),
      ),
    );
  });

  it("denies get and query for old events", async () => {
    const db = publicDb();

    await assertFails(getDoc(doc(db, "events", "event-old")));
    await assertFails(
      getDocs(
        query(
          collection(db, "events"),
          where("meetingCode", "==", "OLD2026"),
          where("status", "==", "old"),
        ),
      ),
    );
  });

  it("denies get and query for archived events", async () => {
    const db = publicDb();

    await assertFails(getDoc(doc(db, "events", "event-archived")));
    await assertFails(
      getDocs(
        query(
          collection(db, "events"),
          where("meetingCode", "==", "ARCHIVED2026"),
          where("status", "==", "archived"),
        ),
      ),
    );
  });

  it("allows authenticated admins to read old and archived events", async () => {
    const db = adminDb();

    await assertSucceeds(getDoc(doc(db, "events", "event-old")));
    await assertSucceeds(getDoc(doc(db, "events", "event-archived")));
    await assertSucceeds(
      getDocs(
        query(
          collection(db, "events"),
          where("status", "==", "archived"),
        ),
      ),
    );
  });
});

describe("writes", () => {
  const collections = [
    "schools",
    "events",
    "students",
    "teachers",
    "classes",
    "teachingAssignments",
    "eventTeacherSetups",
  ];

  for (const collectionName of collections) {
    it(`denies public create, update, and delete on ${collectionName}`, async () => {
      const db = publicDb();
      const existingRef = doc(db, collectionName, existingDocumentId(collectionName));
      const newRef = doc(db, collectionName, "new-public-write");

      await assertFails(setDoc(newRef, { schoolId: "school-1" }));
      await assertFails(updateDoc(existingRef, { publicWriteAttempt: true }));
      await assertFails(deleteDoc(existingRef));
    });

    it(`denies authenticated non-admin create, update, and delete on ${collectionName}`, async () => {
      const db = nonAdminDb();
      const existingRef = doc(db, collectionName, existingDocumentId(collectionName));
      const newRef = doc(db, collectionName, "new-non-admin-write");

      await assertFails(setDoc(newRef, { schoolId: "school-1" }));
      await assertFails(updateDoc(existingRef, { nonAdminWriteAttempt: true }));
      await assertFails(deleteDoc(existingRef));
    });

    it(`allows authenticated admin create, update, and delete on ${collectionName}`, async () => {
      const db = adminDb();
      const existingRef = doc(db, collectionName, existingDocumentId(collectionName));
      const newRef = doc(db, collectionName, "new-admin-write");

      await assertSucceeds(setDoc(newRef, { schoolId: "school-1" }));
      await assertSucceeds(updateDoc(existingRef, { adminWriteAttempt: true }));
      await assertSucceeds(deleteDoc(newRef));
    });
  }
});

describe("event status writes", () => {
  it("denies unauthenticated event status update", async () => {
    await assertFails(
      updateDoc(doc(publicDb(), "events", "event-draft"), {
        status: "active",
      }),
    );
  });

  it("denies authenticated non-admin event status update", async () => {
    await assertFails(
      updateDoc(doc(nonAdminDb(), "events", "event-draft"), {
        status: "active",
      }),
    );
  });

  it("allows authenticated admin event status update", async () => {
    await assertSucceeds(
      updateDoc(doc(adminDb(), "events", "event-draft"), {
        status: "active",
      }),
    );
  });
});

describe("students", () => {
  it("denies direct public get", async () => {
    await assertFails(getDoc(doc(publicDb(), "students", "student-2458")));
  });

  it("allows limited lookup query when limit is <= 1", async () => {
    const db = publicDb();

    await assertSucceeds(
      getDocs(
        query(
          collection(db, "students"),
          where("schoolNumber", "==", "2458"),
          where("schoolId", "==", "school-1"),
          limit(1),
        ),
      ),
    );
  });

  it("denies list query when limit is > 1", async () => {
    const db = publicDb();

    await assertFails(
      getDocs(
        query(
          collection(db, "students"),
          where("schoolId", "==", "school-1"),
          limit(2),
        ),
      ),
    );
  });
});

describe("teachingAssignments", () => {
  it("denies public get", async () => {
    const db = publicDb();

    await assertFails(getDoc(doc(db, "teachingAssignments", "teaching-1")));
  });

  it("allows limited public query when limit is <= 100", async () => {
    const db = publicDb();

    await assertFails(
      getDocs(
        query(
          collection(db, "teachingAssignments"),
          where("schoolId", "==", "school-1"),
        ),
      ),
    );

    await assertSucceeds(
      getDocs(
        query(
          collection(db, "teachingAssignments"),
          where("schoolId", "==", "school-1"),
          limit(100),
        ),
      ),
    );
  });
});

describe("eventTeacherSetups", () => {
  it("denies public get", async () => {
    const db = publicDb();

    await assertFails(getDoc(doc(db, "eventTeacherSetups", "setup-1")));
  });

  it("allows limited public query when limit is <= 100", async () => {
    const db = publicDb();

    await assertFails(
      getDocs(
        query(
          collection(db, "eventTeacherSetups"),
          where("eventId", "==", "event-active"),
        ),
      ),
    );

    await assertSucceeds(
      getDocs(
        query(
          collection(db, "eventTeacherSetups"),
          where("eventId", "==", "event-active"),
          limit(100),
        ),
      ),
    );
  });
});

describe("supporting reads", () => {
  it("allows get for schools, classes, and teachers by document ID", async () => {
    const db = publicDb();

    await assertSucceeds(getDoc(doc(db, "schools", "school-1")));
    await assertSucceeds(getDoc(doc(db, "classes", "class-7-b")));
    await assertSucceeds(getDoc(doc(db, "teachers", "teacher-1")));
  });
});

function existingDocumentId(collectionName: string): string {
  switch (collectionName) {
    case "schools":
      return "school-1";
    case "events":
      return "event-active";
    case "students":
      return "student-2458";
    case "teachers":
      return "teacher-1";
    case "classes":
      return "class-7-b";
    case "teachingAssignments":
      return "teaching-1";
    case "eventTeacherSetups":
      return "setup-1";
    default:
      return "unknown";
  }
}
