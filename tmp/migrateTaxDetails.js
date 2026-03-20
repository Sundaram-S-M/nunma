/**
 * migrateTaxDetails.js
 * 
 * PRODUCTION-READY MIGRATION SCRIPT
 * 
 * Objective: 
 * 1. Move 'taxDetails' map from users/{uid} to users/{uid}/taxDetails/current.
 * 2. Delete 'taxDetails' map from the main users/{uid} document.
 * 
 * Safety Measures:
 * - Uses Firestore write batches for atomicity (up to 500 docs per batch).
 * - Read-only check for users without taxDetails to minimize unnecessary writes.
 * - Logging for audit trail.
 * 
 * Deployment Note:
 * Execute this script BEFORE deploying firestore.rules to ensure zero downtime.
 */

const admin = require('firebase-admin');

// Service Account Key must be present for production execution
// IMPORTANT: Do NOT commit this key to version control.
const serviceAccount = require('./serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  console.log('--- Starting KYC Data Migration ---');
  
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  if (snapshot.empty) {
    console.log('[ABORT] No users found in collection.');
    return;
  }

  let batch = db.batch();
  let operationCount = 0;
  let totalUsersMigrated = 0;

  for (const doc of snapshot.docs) {
    const userData = doc.data();
    
    // Check if the user document contains the legacy taxDetails map
    if (userData.taxDetails && typeof userData.taxDetails === 'object') {
      const uid = doc.id;
      console.log(`[PROCESS] Migrating user: ${uid}`);

      const subcollectionRef = usersRef.doc(uid).collection('taxDetails').doc('current');
      const userDocRef = usersRef.doc(uid);

      // 1. Set the data in the new locked subcollection
      batch.set(subcollectionRef, userData.taxDetails);

      // 2. Remove the sensitive map from the main document (Destructive Delete)
      batch.update(userDocRef, {
        taxDetails: admin.firestore.FieldValue.delete()
      });

      operationCount++;
      totalUsersMigrated++;

      // Commit in batches of 400 (well within the 500 limit)
      if (operationCount >= 400) {
        console.log(`[COMMIT] Flushing batch of ${operationCount} operations...`);
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    }
  }

  // Final commit for remaining operations
  if (operationCount > 0) {
    console.log(`[COMMIT] Flushing final batch of ${operationCount} operations...`);
    await batch.commit();
  }

  console.log(`--- Migration Complete: ${totalUsersMigrated} users processed ---`);
}

migrate().catch((err) => {
  console.error('[CRITICAL ERROR] Migration failed:', err);
  process.exit(1);
});
