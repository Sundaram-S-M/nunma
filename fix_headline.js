const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./serviceAccountKey.json'); // assuming it exists from proxy.js

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixHeadline() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('headline', '==', 'Expert Educator').get();

  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  snapshot.forEach(async doc => {
    console.log('Found user:', doc.id, doc.data().name);
    await doc.ref.update({ headline: '' });
    console.log('Cleared headline for', doc.data().name);
  });
}

fixHeadline().catch(console.error);
