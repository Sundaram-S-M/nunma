const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Assumes standard service account usage or via GOOGLE_APPLICATION_CREDENTIALS

// Initialize Firebase Admin (Modify initializeApp logic based on your execution environment)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Set to true to do a dry-run without actually modifying documents. Set to false to execute deletion.
const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('dry-run') || true;

async function scrubPiiData() {
    console.log(`Starting PII scrub... DRY_RUN is ${DRY_RUN}`);
    try {
        const usersSnapshot = await db.collection('users').get();
        let affectedCount = 0;
        let totalCount = usersSnapshot.size;

        const batchPromises = [];

        usersSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.taxDetails) {
                const updates = {};
                let requiresUpdate = false;

                if (data.taxDetails.pan) {
                    updates['taxDetails.pan'] = admin.firestore.FieldValue.delete();
                    requiresUpdate = true;
                }
                
                // If you stored full bankAccount historically
                if (data.taxDetails.bankAccount) {
                    updates['taxDetails.bankAccount'] = admin.firestore.FieldValue.delete();
                    requiresUpdate = true;
                }

                if (requiresUpdate) {
                    affectedCount++;
                    if (!DRY_RUN) {
                        batchPromises.push(doc.ref.update(updates));
                    }
                }
            }
        });

        if (!DRY_RUN) {
            console.log(`Executing deletion on ${affectedCount} documents...`);
            await Promise.all(batchPromises);
            console.log(`Successfully scrubbed ${affectedCount} out of ${totalCount} users.`);
        } else {
            console.log(`[DRY RUN] Would have scrubbed PII from ${affectedCount} out of ${totalCount} users.`);
        }

    } catch (error) {
        console.error('Error during PII scrub:', error);
    }
}

scrubPiiData();
