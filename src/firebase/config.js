import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);

export const APIFY_API_KEY = import.meta.env.VITE_APIFY_API_KEY || "";
export const GENERATE_STRATEGY_URL = "https://us-central1-freeflow-media.cloudfunctions.net/generateStrategy";
export const GENERATE_AI_LEADS_URL = "https://us-central1-freeflow-media.cloudfunctions.net/generateAILeads";
export const GENERATE_OUTREACH_SCRIPT_URL = "https://us-central1-freeflow-media.cloudfunctions.net/generateOutreachScript";
export const SEND_LEAD_ALERT_URL = "https://us-central1-freeflow-media.cloudfunctions.net/sendLeadAlert";
export const GENERATE_OUTREACH_EMAIL_URL = "https://us-central1-freeflow-media.cloudfunctions.net/generateOutreachEmail";
export const CONTENT_GENERATOR_PROXY_URL = "https://us-central1-freeflow-media.cloudfunctions.net/contentGeneratorProxy";
export default app;