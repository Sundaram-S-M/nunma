import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkUser() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.limit(15).get();

  snapshot.forEach(doc => {
    console.log('User:', doc.data().name, '->', doc.data().avatar);
  });
}

checkUser().catch(console.error);
