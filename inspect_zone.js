import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectZone() {
  // Let's get the list of zones
  const zonesSnap = await db.collection('zones').get();
  console.log("Found zones:");
  for (const zoneDoc of zonesSnap.docs) {
    const data = zoneDoc.data();
    console.log(`Zone ID: ${zoneDoc.id}, Title: ${data.title}, CreatedBy: ${data.createdBy}, Price: ${data.price}`);
    
    // Let's get whitelisted emails
    console.log("  Whitelisted emails:", data.whitelistedEmails);

    // Let's get enrolled students in this zone
    const studentsSnap = await db.collection('zones').doc(zoneDoc.id).collection('students').get();
    console.log(`  Enrolled students count: ${studentsSnap.size}`);
    studentsSnap.forEach(sDoc => {
      console.log(`    Student ID: ${sDoc.id}, Name: ${sDoc.data().name}, Email: ${sDoc.data().email}`);
    });
  }
}

inspectZone().catch(console.error);
