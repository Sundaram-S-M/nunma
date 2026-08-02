import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

// Get config from firebase.ts
import { firebaseConfig } from './utils/firebase.js'; // Need to check where config is
