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
  const snapshot = await usersRef.where('name', '==', 'Lakshmi kanth').get();

  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  snapshot.forEach(doc => {
    console.log('User ID:', doc.id);
    const data = doc.data();
    console.log('kycStatus:', data.kycStatus);
    console.log('razorpayAccountId:', data.razorpayAccountId);
    console.log('razorpay_account_id:', data.razorpay_account_id);
    console.log('isDevBypass:', data.isDevBypass);
    console.log('isWhitelisted:', data.isWhitelisted);
  });
}

checkUser().catch(console.error);
