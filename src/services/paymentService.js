import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const nanoid = (len = 8) =>
  Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32])
    .join('');

export const submitPaymentRequest = (data) =>
  addDoc(collection(db, 'paymentRequests'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

export const getPendingPaymentRequests = async () => {
  const snap = await getDocs(
    query(collection(db, 'paymentRequests'), where('status', '==', 'pending'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const approvePaymentRequest = async (requestId, clientEmail) => {
  const code = nanoid();
  await addDoc(collection(db, 'accessCodes'), {
    code,
    email: clientEmail,
    requestId,
    used: false,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'paymentRequests', requestId), {
    status: 'approved',
    approvedAt: serverTimestamp(),
  });
  return code;
};

export const rejectPaymentRequest = (requestId) =>
  updateDoc(doc(db, 'paymentRequests', requestId), {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
  });
