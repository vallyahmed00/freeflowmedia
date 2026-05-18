import { db } from '../firebase/config';
import {
  collection, addDoc, query, where, orderBy, limit,
  getDocs, doc, updateDoc, setDoc, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { CONTENT_GENERATOR_PROXY_URL } from '../firebase/config';

export async function generateContent({ contentType, category, tone, brief, businessContext, targetAudience, brandVoice, userEmail }) {
  const res = await fetch(CONTENT_GENERATOR_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType, category, tone, brief, businessContext, targetAudience, brandVoice, userEmail }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Generation failed');
  }
  return res.json();
}

export async function getGenerations(userEmail, limitCount = 50) {
  const q = query(
    collection(db, 'content_generations'),
    where('userEmail', '==', userEmail),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateGenerationStatus(id, status) {
  await updateDoc(doc(db, 'content_generations', id), { status });
}

export async function updateGenerationOutput(id, output) {
  await updateDoc(doc(db, 'content_generations', id), { output, charCount: output.length });
}

export async function scheduleGeneration(id, scheduledDate) {
  await updateDoc(doc(db, 'content_generations', id), { scheduledDate, status: 'scheduled' });
}

export async function saveBrandVoice(userEmail, profile) {
  const ref = doc(db, 'brandVoiceProfiles', userEmail);
  try {
    await updateDoc(ref, { ...profile, userEmail, updatedAt: serverTimestamp() });
  } catch {
    await setDoc(ref, { ...profile, userEmail, updatedAt: serverTimestamp() });
  }
  localStorage.setItem('driftStudio_brandVoice', JSON.stringify(profile));
}

export async function getBrandVoice(userEmail) {
  const cached = localStorage.getItem('driftStudio_brandVoice');
  if (cached) return JSON.parse(cached);
  const snap = await getDoc(doc(db, 'brandVoiceProfiles', userEmail));
  if (snap.exists()) {
    const data = snap.data();
    localStorage.setItem('driftStudio_brandVoice', JSON.stringify(data));
    return data;
  }
  return null;
}

export async function logPerformance({ generationId, userEmail, platform, contentType, tone, reach, likes, comments, shares, clicks, conversions }) {
  const engagementRate = reach > 0 ? ((likes + comments + shares) / reach) * 100 : 0;
  const baselines = { instagram: 3, facebook: 1, linkedin: 2, twitter: 1.5, tiktok: 5 };
  const baseline = baselines[platform?.toLowerCase()] || 2;
  const engScore = Math.min(100, (engagementRate / baseline) * 50);
  const ctrScore = clicks && reach ? Math.min(100, (clicks / reach) * 100 * 20) : 0;
  const convScore = conversions && clicks ? Math.min(100, (conversions / clicks) * 100 * 30) : 0;
  const score = Math.round(engScore * 0.6 + ctrScore * 0.25 + convScore * 0.15);

  const docRef = await addDoc(collection(db, 'content_performance'), {
    generationId, userEmail, platform, contentType, tone,
    reach, likes, comments: comments || 0, shares: shares || 0,
    engagementRate: Math.round(engagementRate * 100) / 100,
    clicks: clicks || null,
    conversions: conversions || null,
    score,
    loggedAt: serverTimestamp(),
  });
  return { id: docRef.id, score };
}

export async function getPerformanceLogs(userEmail) {
  const q = query(
    collection(db, 'content_performance'),
    where('userEmail', '==', userEmail),
    orderBy('loggedAt', 'desc'),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getStudioStats(userEmail) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const q = query(
    collection(db, 'content_generations'),
    where('userEmail', '==', userEmail),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const thisMonth = docs.filter(d => d.createdAt?.toDate() >= thisMonthStart);
  const lastMonth = docs.filter(d => {
    const dt = d.createdAt?.toDate();
    return dt >= lastMonthStart && dt < thisMonthStart;
  });

  const typeCounts = {};
  const toneCounts = {};
  thisMonth.forEach(d => {
    typeCounts[d.contentType] = (typeCounts[d.contentType] || 0) + 1;
    toneCounts[d.tone] = (toneCounts[d.tone] || 0) + 1;
  });

  const daily = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    daily[d.toISOString().split('T')[0]] = 0;
  }
  docs.forEach(d => {
    const dt = d.createdAt?.toDate();
    if (!dt) return;
    const key = dt.toISOString().split('T')[0];
    if (key in daily) daily[key]++;
  });

  const delta = lastMonth.length > 0
    ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100)
    : null;

  return {
    totalThisMonth: thisMonth.length,
    totalLastMonth: lastMonth.length,
    delta,
    topType: Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    topTone: Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    typeCounts: Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8),
    toneCounts: Object.entries(toneCounts).sort((a, b) => b[1] - a[1]),
    daily: Object.entries(daily).map(([date, count]) => ({ date, count })),
  };
}
