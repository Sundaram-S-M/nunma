const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function run() {
  console.log("Fetching all documents from 'conversations' collection...");
  const snap = await db.collection('conversations').get();
  console.log(`Total conversations found: ${snap.size}`);
  
  snap.forEach(doc => {
    console.log(`- Conversation ID: ${doc.id}`);
    console.log(`  Data:`, doc.data());
  });
}

run().catch(console.error);
