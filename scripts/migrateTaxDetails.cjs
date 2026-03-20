process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "nunma-by-cursor";

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "nunma-by-cursor"
  });
}

const db = admin.firestore();

async function runMigration() {
  console.log("Starting Migration on True Project: nunma-by-cursor...");
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  if (snapshot.empty) {
    console.log("Database is completely empty. No users exist at all.");
    return;
  }

  let migratedCount = 0;
  const batch = db.batch();

  snapshot.forEach((doc) => {
    const data = doc.data();

    // Check if the vulnerable taxDetails map exists on the main document
    if (data.taxDetails) {
      console.log(`Found vulnerable data for user: ${doc.id}`);

      // 1. Copy to the secure subcollection
      const secureRef = usersRef.doc(doc.id).collection('taxDetails').doc('current');
      batch.set(secureRef, data.taxDetails);

      // 2. Queue the deletion of the old field
      const mainDocRef = usersRef.doc(doc.id);
      batch.update(mainDocRef, {
        taxDetails: admin.firestore.FieldValue.delete()
      });

      migratedCount++;
    }
  });

  if (migratedCount === 0) {
    console.log("No users found with the vulnerable 'taxDetails' field.");
    return;
  }

  await batch.commit();
  console.log(`SUCCESS: Migrated ${migratedCount} user(s) and locked the vault.`);
}

runMigration().catch(console.error);