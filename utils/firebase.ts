import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";

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

let app: FirebaseApp | null = null;
if (!getApps().length) {
    if (isConfigValid) {
        app = initializeApp(firebaseConfig);
    } else {
        console.warn("Firebase configuration is missing or incomplete. ⚡ Switching to MOCK MODE for local development.");
        console.log("To enable real Firebase features, create a .env.local file with your API keys.");
    }
} else {
    app = getApp();
}

let analytics: any = null;
if (app && typeof window !== 'undefined') {
    import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
        isSupported().then(supported => {
            if (supported && app) analytics = getAnalytics(app);
        });
    }).catch(err => console.error('Analytics failed to load:', err));
}

const auth: Auth | null = app ? getAuth(app) : null;
const db: Firestore | null = app ? getFirestore(app) : null;
const functions: Functions | null = app ? getFunctions(app) : null;
export { app, analytics, auth, db, functions };
