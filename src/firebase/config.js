import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAoFDXNs8eRwPTn56T-LMIvsFZJFPA_oZw",
  authDomain: "freeflow-media.firebaseapp.com",
  projectId: "freeflow-media",
  storageBucket: "freeflow-media.firebasestorage.app",
  messagingSenderId: "103426838649",
  appId: "1:103426838649:web:f232200d2a33772a8ec4a8",
  measurementId: "G-QTH4Z9EYKD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);
export const GENERATE_STRATEGY_URL = "https://us-central1-freeflow-media.cloudfunctions.net/generateStrategy";
export default app;