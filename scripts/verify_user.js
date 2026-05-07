
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // I'll assume this exists or they can provide it

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const uid = process.env.TARGET_UID;

if (!uid) {
    console.error('ERROR: TARGET_UID environment variable is not set.');
    console.log('Usage: TARGET_UID=<firebase_uid> node scripts/verify_user.js');
    process.exit(1);
}

async function verifyUser() {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) {
        console.log('No such user!');
        return;
    }
    console.log('Current Data:', doc.data());
    
    await userRef.update({
        kycStatus: 'VERIFIED',
        razorpay_account_id: 'acc_SYC4Xx4JennSWZ'
    });
    console.log('User status updated to VERIFIED');
}

verifyUser().catch(console.error);
