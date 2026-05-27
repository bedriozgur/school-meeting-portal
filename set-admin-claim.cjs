const admin = require("firebase-admin");

admin.initializeApp({
  projectId: "school-meeting-portal",
});

async function main() {
  const email = "bedri.ozgur@hotmail.com";
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`Admin claim set for ${email}`);
}

main().catch(console.error);
