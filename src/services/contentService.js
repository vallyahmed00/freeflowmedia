import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  serverTimestamp,
  setDoc,
  where,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';

// ==================== TESTIMONIALS ====================

export const testimonialsCollection = collection(db, 'testimonials');

export const addTestimonial = async (data) => {
  return await addDoc(testimonialsCollection, {
    name: data.name,
    role: data.role,
    company: data.company,
    quote: data.quote,
    rating: data.rating || 5,
    imageUrl: data.imageUrl || null,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateTestimonial = async (id, data) => {
  const docRef = doc(db, 'testimonials', id);
  return await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteTestimonial = async (id) => {
  const docRef = doc(db, 'testimonials', id);
  return await deleteDoc(docRef);
};

export const getAllTestimonials = async (activeOnly = true) => {
  const q = query(testimonialsCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const testimonials = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  return activeOnly ? testimonials.filter(t => t.isActive) : testimonials;
};

// ==================== TRUST BADGES / CLIENT LOGOS ====================

export const trustBadgesCollection = collection(db, 'trustBadges');

export const addTrustBadge = async (data) => {
  return await addDoc(trustBadgesCollection, {
    companyName: data.companyName,
    industry: data.industry || '',
    logoUrl: data.logoUrl || null,
    website: data.website || '',
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateTrustBadge = async (id, data) => {
  const docRef = doc(db, 'trustBadges', id);
  return await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteTrustBadge = async (id) => {
  const docRef = doc(db, 'trustBadges', id);
  return await deleteDoc(docRef);
};

export const getAllTrustBadges = async (activeOnly = true) => {
  const q = query(trustBadgesCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const badges = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  return activeOnly ? badges.filter(b => b.isActive) : badges;
};

// ==================== STATS ====================

export const statsDoc = doc(db, 'siteContent', 'stats');

export const getStats = async () => {
  const snapshot = await getDoc(statsDoc);
  if (snapshot.exists()) {
    return snapshot.data();
  }
  return null;
};

export const setStats = async (data) => {
  return await setDoc(statsDoc, {
    stat1: data.stat1 || { value: '', label: '' },
    stat2: data.stat2 || { value: '', label: '' },
    stat3: data.stat3 || { value: '', label: '' },
    stat4: data.stat4 || { value: '', label: '' },
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// ==================== SOCIAL PROOF NOTIFICATIONS ====================

export const socialProofCollection = collection(db, 'socialProofNotifications');

export const addSocialProofNotification = async (data) => {
  return await addDoc(socialProofCollection, {
    text: data.text,
    isActive: data.isActive !== undefined ? data.isActive : true,
    order: data.order || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateSocialProofNotification = async (id, data) => {
  const docRef = doc(db, 'socialProofNotifications', id);
  return await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteSocialProofNotification = async (id) => {
  const docRef = doc(db, 'socialProofNotifications', id);
  return await deleteDoc(docRef);
};

export const getAllSocialProofNotifications = async (activeOnly = true) => {
  const q = query(socialProofCollection, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  const notifications = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  return activeOnly ? notifications.filter(n => n.isActive) : notifications;
};

// ==================== LEADS MANAGEMENT ====================

export const leadsCollection = collection(db, 'leads');

export const addLead = async (data) => {
  return await addDoc(leadsCollection, {
    business_name: data.business_name || '',
    industry: data.industry || '',
    location: data.location || '',
    status: data.status || 'new',
    email: data.email || '',
    phone: data.phone || '',
    website: data.website || '',
    notes: data.notes || '',
    source: data.source || 'manual', // manual, apify, contact_form, n8n
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateLead = async (id, data) => {
  const docRef = doc(db, 'leads', id);
  return await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteLead = async (id) => {
  const docRef = doc(db, 'leads', id);
  return await deleteDoc(docRef);
};

export const getAllLeads = async (filters = {}) => {
  let q = leadsCollection;
  
  // Apply filters
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getLeadById = async (id) => {
  const docRef = doc(db, 'leads', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

// Real-time listener for leads
export const subscribeToLeads = (callback, filters = {}) => {
  let q = leadsCollection;
  
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const leads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(leads);
  });
};

// Get leads by status counts
export const getLeadStats = async () => {
  const snapshot = await getDocs(leadsCollection);
  const leads = snapshot.docs.map(doc => doc.data());
  
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    interested: leads.filter(l => l.status === 'interested').length,
    not_interested: leads.filter(l => l.status === 'not_interested').length,
    follow_up: leads.filter(l => l.status === 'follow_up').length,
    converted: leads.filter(l => l.status === 'converted').length
  };
  
  return stats;
};

// Bulk delete leads
export const bulkDeleteLeads = async (leadIds) => {
  const promises = leadIds.map(id => deleteLead(id));
  return await Promise.all(promises);
};

// Bulk update leads status
export const bulkUpdateLeadStatus = async (leadIds, newStatus) => {
  const promises = leadIds.map(id => updateLead(id, { status: newStatus }));
  return await Promise.all(promises);
};

// Search leads
export const searchLeads = async (searchTerm) => {
  const snapshot = await getDocs(
    query(leadsCollection, orderBy('createdAt', 'desc'))
  );
  
  const leads = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  if (!searchTerm) return leads;
  
  const lowerSearch = searchTerm.toLowerCase();
  return leads.filter(lead => 
    lead.business_name?.toLowerCase().includes(lowerSearch) ||
    lead.industry?.toLowerCase().includes(lowerSearch) ||
    lead.location?.toLowerCase().includes(lowerSearch) ||
    lead.email?.toLowerCase().includes(lowerSearch)
  );
};

// Export leads to CSV
export const exportLeadsToCSV = (leads) => {
  const headers = ['Business Name', 'Industry', 'Location', 'Status', 'Email', 'Phone', 'Website', 'Notes', 'Source', 'Created At'];
  const csvData = leads.map(lead => [
    lead.business_name || '',
    lead.industry || '',
    lead.location || '',
    lead.status || '',
    lead.email || '',
    lead.phone || '',
    lead.website || '',
    lead.notes || '',
    lead.source || '',
    lead.createdAt ? new Date(lead.createdAt.toDate()).toLocaleDateString() : ''
  ]);

  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `freeflow-leads-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// ==================== IMAGE UPLOAD ====================

export const uploadImage = async (file, folder = 'content') => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const storageRef = ref(storage, fileName);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  
  return downloadUrl;
};

export const deleteImage = async (imageUrl) => {
  if (!imageUrl) return;
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
  }
};
