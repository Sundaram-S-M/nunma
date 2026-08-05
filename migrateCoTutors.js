import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
    console.log("Starting migration...");
    const zonesSnap = await getDocs(collection(db, 'zones'));
    
    let updatedCount = 0;
    
    for (const zoneDoc of zonesSnap.docs) {
        const data = zoneDoc.data();
        if (data.coTutors && Array.isArray(data.coTutors) && data.coTutors.length > 0) {
            const coTutorUids = data.coTutors.map(t => t.uid);
            await updateDoc(doc(db, 'zones', zoneDoc.id), { coTutorUids });
            console.log(`Updated zone ${zoneDoc.id} with ${coTutorUids.length} coTutors`);
            updatedCount++;
        }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} zones.`);
    process.exit(0);
}

migrate();
