import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Defensive check to ensure we have at least the minimum required config
const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.appId;

let app;
if (!getApps().length) {
    if (isConfigValid) {
        app = initializeApp(firebaseConfig);
    } else {
        console.warn("Firebase configuration is missing or incomplete. ⚡ Switching to MOCK MODE for local development.");
        console.log("To enable real Firebase features, create a .env.local file with your API keys.");
        app = null;
    }
} else {
    app = getApp();
}

let analytics = null;
if (app && typeof window !== 'undefined') {
    import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
        isSupported().then(supported => {
            if (supported) analytics = getAnalytics(app);
        });
    }).catch(err => console.error('Analytics failed to load:', err));
}

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const functions = app ? getFunctions(app) : null;
const storage = app ? getStorage(app) : null;

// Emulator support for local development and CI
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    if (auth) connectAuthEmulator(auth, "http://localhost:9099");
    if (db) connectFirestoreEmulator(db, "localhost", 8080);
    if (functions) connectFunctionsEmulator(functions, "localhost", 5001);
    if (storage) connectStorageEmulator(storage, "localhost", 9199);
    console.log("⚡ Connected to Firebase Emulators");
}

export { app, analytics, auth, db, functions, storage };
