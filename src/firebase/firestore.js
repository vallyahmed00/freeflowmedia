import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';

// Clients collection
export const clientsRef = collection(db, 'clients');

// Create a new client document
export const createClient = async (clientData) => {
  try {
    const docRef = await addDoc(clientsRef, {
      ...clientData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

// Get client by ID
export const getClient = async (clientId) => {
  try {
    const docRef = doc(db, 'clients', clientId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting client:', error);
    throw error;
  }
};

// Get client's campaigns
export const getClientCampaigns = async (clientId) => {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting campaigns:', error);
    throw error;
  }
};

// Real-time listener for campaigns
export const subscribeToCampaigns = (clientId, callback) => {
  const q = query(
    collection(db, 'campaigns'),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(campaigns);
  });
};

// Get client's leads
export const getClientLeads = async (clientId) => {
  try {
    const q = query(
      collection(db, 'leads'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting leads:', error);
    throw error;
  }
};

// Get client's reports
export const getClientReports = async (clientId) => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('clientId', '==', clientId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting reports:', error);
    throw error;
  }
};

// Update campaign stats
export const updateCampaignStats = async (campaignId, stats) => {
  try {
    const docRef = doc(db, 'campaigns', campaignId);
    await updateDoc(docRef, { stats, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error('Error updating campaign:', error);
    throw error;
  }
};
