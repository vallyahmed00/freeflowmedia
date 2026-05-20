/**
 * Lead Management Service — Firestore implementation
 *
 * Replaces the old FastAPI-backed leadApi.js that pointed to
 * http://localhost:8000/api (which was never deployed).
 *
 * All CRUD operations go directly to Firestore collection: `leads`.
 * Interaction notes are stored in the subcollection: leads/{id}/interactions.
 *
 * TODO: The searchLeads / generateLeads path currently filters Firestore data
 * client-side. If you need real Apify lead scraping, replace the body of
 * searchLeads with a call to a Firebase Function that wraps the Apify API.
 */

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
  serverTimestamp,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const LEADS_COL = 'leads';

// ─── helpers ────────────────────────────────────────────────────────────────

const mapDoc = (snap) => ({ id: snap.id, ...snap.data() });

// ─── CRUD ───────────────────────────────────────────────────────────────────

/**
 * Fetch all leads, optionally filtered by status and/or source.
 * @param {Object} filters  e.g. { status: 'new', source: 'manual' }
 */
export const fetchLeads = async (filters = {}) => {
  try {
    let q = collection(db, LEADS_COL);
    const constraints = [];

    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.source) {
      constraints.push(where('source', '==', filters.source));
    }
    if (filters.industry) {
      constraints.push(where('industry', '==', filters.industry));
    }
    if (filters.location) {
      constraints.push(where('location', '==', filters.location));
    }

    constraints.push(orderBy('createdAt', 'desc'));
    q = query(q, ...constraints);

    const snap = await getDocs(q);
    return snap.docs.map(mapDoc);
  } catch (err) {
    console.error('[leadApi] fetchLeads error:', err);
    throw err;
  }
};

/**
 * Get a single lead by Firestore document ID.
 */
export const getLead = async (id) => {
  try {
    const snap = await getDoc(doc(db, LEADS_COL, id));
    if (!snap.exists()) return null;
    return mapDoc(snap);
  } catch (err) {
    console.error('[leadApi] getLead error:', err);
    throw err;
  }
};

/**
 * Create a new lead document.
 */
export const createLead = async (data) => {
  try {
    const payload = {
      business_name: data.business_name || '',
      contact_name: data.contact_name || '',
      email: data.email || '',
      phone: data.phone || '',
      website: data.website || '',
      industry: data.industry || '',
      location: data.location || '',
      country: data.country || 'South Africa',
      description: data.description || '',
      source: data.source || 'manual',
      status: data.status || 'new',
      priority_score: data.priority_score ?? 0,
      notes: data.notes || '',
      followUpDate: data.followUpDate || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, LEADS_COL), payload);
    return { id: ref.id, ...payload };
  } catch (err) {
    console.error('[leadApi] createLead error:', err);
    throw err;
  }
};

/**
 * Update an existing lead document.
 */
export const updateLead = async (id, data) => {
  try {
    const ref = doc(db, LEADS_COL, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { id, ...data };
  } catch (err) {
    console.error('[leadApi] updateLead error:', err);
    throw err;
  }
};

/**
 * Delete a lead document (does not delete its interactions subcollection —
 * Firestore doesn't cascade-delete subcollections automatically).
 */
export const deleteLead = async (id) => {
  try {
    await deleteDoc(doc(db, LEADS_COL, id));
    return { id };
  } catch (err) {
    console.error('[leadApi] deleteLead error:', err);
    throw err;
  }
};

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────

/**
 * Count leads by status for the dashboard.
 * Returns { total, new, contacted, interested, converted, follow_up, not_interested }
 */
export const getDashboardStats = async () => {
  try {
    const snap = await getDocs(collection(db, LEADS_COL));
    const leads = snap.docs.map((d) => d.data());
    return {
      total: leads.length,
      new: leads.filter((l) => l.status === 'new').length,
      contacted: leads.filter((l) => l.status === 'contacted').length,
      interested: leads.filter((l) => l.status === 'interested').length,
      not_interested: leads.filter((l) => l.status === 'not_interested').length,
      follow_up: leads.filter((l) => l.status === 'follow_up').length,
      converted: leads.filter((l) => l.status === 'converted').length,
    };
  } catch (err) {
    console.error('[leadApi] getDashboardStats error:', err);
    throw err;
  }
};

// ─── BULK OPERATIONS ────────────────────────────────────────────────────────

/**
 * Batch delete multiple leads.
 * @param {string[]} ids
 */
export const bulkDeleteLeads = async (ids) => {
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => batch.delete(doc(db, LEADS_COL, id)));
    await batch.commit();
    return { deleted: ids.length };
  } catch (err) {
    console.error('[leadApi] bulkDeleteLeads error:', err);
    throw err;
  }
};

/**
 * Batch update the status of multiple leads.
 * @param {string[]} ids
 * @param {string} status
 */
export const bulkUpdateStatus = async (ids, status) => {
  try {
    const batch = writeBatch(db);
    ids.forEach((id) =>
      batch.update(doc(db, LEADS_COL, id), { status, updatedAt: serverTimestamp() })
    );
    await batch.commit();
    return { updated: ids.length };
  } catch (err) {
    console.error('[leadApi] bulkUpdateStatus error:', err);
    throw err;
  }
};

// ─── SEARCH / GENERATE ──────────────────────────────────────────────────────

const GENERATE_LEADS_URL = 'https://generateleads-twv5vwv4qa-uc.a.run.app';

export const searchLeads = async (params = {}) => {
  const response = await fetch(GENERATE_LEADS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'Lead generation failed');
  }
  return response.json();
};

// ─── INTERACTION NOTES (subcollection) ──────────────────────────────────────

/**
 * Add a timestamped note to leads/{id}/interactions.
 */
export const addInteraction = async (leadId, text) => {
  try {
    const ref = collection(db, LEADS_COL, leadId, 'interactions');
    const payload = { text, createdAt: serverTimestamp() };
    const docRef = await addDoc(ref, payload);
    return { id: docRef.id, ...payload };
  } catch (err) {
    console.error('[leadApi] addInteraction error:', err);
    throw err;
  }
};

/**
 * Fetch all interactions for a lead, newest first.
 */
export const getInteractions = async (leadId) => {
  try {
    const q = query(
      collection(db, LEADS_COL, leadId, 'interactions'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapDoc);
  } catch (err) {
    console.error('[leadApi] getInteractions error:', err);
    throw err;
  }
};

// ─── REAL-TIME LISTENER ──────────────────────────────────────────────────────

/**
 * Subscribe to real-time lead updates.
 * Returns an unsubscribe function.
 */
export const subscribeToLeads = (callback, filters = {}) => {
  try {
    const constraints = [];
    if (filters.status) constraints.push(where('status', '==', filters.status));
    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(collection(db, LEADS_COL), ...constraints);
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(mapDoc));
    });
  } catch (err) {
    console.error('[leadApi] subscribeToLeads error:', err);
    return () => {};
  }
};

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────

/**
 * Generate and download a CSV file from a leads array.
 */
export const exportLeadsToCSV = (leads) => {
  const headers = [
    'Business Name',
    'Contact',
    'Email',
    'Phone',
    'Website',
    'Industry',
    'Location',
    'Status',
    'Priority Score',
    'Source',
    'Notes',
    'Created Date',
  ];

  const rows = leads.map((l) => [
    l.business_name || '',
    l.contact_name || '',
    l.email || '',
    l.phone || '',
    l.website || '',
    l.industry || '',
    l.location || '',
    l.status || '',
    l.priority_score != null ? Math.round(l.priority_score * 100) + '%' : '',
    l.source || '',
    l.notes || '',
    l.createdAt?.toDate ? l.createdAt.toDate().toLocaleDateString() : '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drift-leads-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── LEAD SEARCH TARGETS ────────────────────────────────────────────────────

const TARGETS_COL = 'leadSearchTargets';

export const getSearchTargets = async () => {
  try {
    const snap = await getDocs(
      query(collection(db, TARGETS_COL), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map(mapDoc);
  } catch (err) {
    console.error('[leadApi] getSearchTargets error:', err);
    throw err;
  }
};

export const saveSearchTarget = async ({ query: q, location, industry = '', maxResults = 20 }) => {
  try {
    const ref = await addDoc(collection(db, TARGETS_COL), {
      query: q,
      location,
      industry,
      maxResults,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastRunAt: null,
      leadsFoundLastRun: null,
    });
    return ref.id;
  } catch (err) {
    console.error('[leadApi] saveSearchTarget error:', err);
    throw err;
  }
};

export const toggleSearchTarget = async (id, active) => {
  try {
    await updateDoc(doc(db, TARGETS_COL, id), { active, updatedAt: serverTimestamp() });
  } catch (err) {
    console.error('[leadApi] toggleSearchTarget error:', err);
    throw err;
  }
};

export const deleteSearchTarget = async (id) => {
  try {
    await deleteDoc(doc(db, TARGETS_COL, id));
  } catch (err) {
    console.error('[leadApi] deleteSearchTarget error:', err);
    throw err;
  }
};

// ─── Legacy named export for backwards compat ────────────────────────────────
// Generator.jsx and any other files that imported `leadApi` as a named object
// can import individual functions above.  For files that do:
//   import { leadApi } from '../services/leadApi'
// we expose a compatible object here.

export const leadApi = {
  fetchLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  searchLeads,
  getDashboardStats,
  bulkDeleteLeads,
  bulkUpdateStatus,
  addInteraction,
  getInteractions,
  subscribeToLeads,
  exportLeadsToCSV,
  getSearchTargets,
  saveSearchTarget,
  toggleSearchTarget,
  deleteSearchTarget,
  // Legacy aliases
  bulkImportLeads: async (leads) => {
    const results = await Promise.all(leads.map((l) => createLead(l)));
    return results;
  },
};

export default leadApi;
