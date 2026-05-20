import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const WEBHOOK_URL = import.meta.env.VITE_SALES_AGENT_WEBHOOK_URL;

export const markLeadReplied = async (leadId) => {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, type: 'replied' }),
  });
  if (!res.ok) throw new Error('Failed to mark lead as replied');
};

export const markLeadQualified = async (leadId) => {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, type: 'qualified' }),
  });
  if (!res.ok) throw new Error('Failed to mark lead as qualified');
};

export const stopOutreach = async (leadId) => {
  await updateDoc(doc(db, 'leads', leadId), {
    'salesAgent.stopRequested': true,
  });
};

export const SALES_AGENT_STATUS_LABELS = {
  pending: 'Pending',
  contacted: 'Day 1 Sent',
  followed_up_1: 'Day 3 Sent',
  followed_up_2: 'Day 7 Sent',
  replied: 'Replied',
  qualified: 'Qualified',
  not_interested: 'Not Interested',
  no_response: 'No Response',
  bounced: 'Bounced',
};

export const SALES_AGENT_STATUS_COLORS = {
  pending: '#6B7280',
  contacted: '#3B82F6',
  followed_up_1: '#8B5CF6',
  followed_up_2: '#7C3AED',
  replied: '#F59E0B',
  qualified: '#22C55E',
  not_interested: '#EF4444',
  no_response: '#6B7280',
  bounced: '#DC2626',
};
