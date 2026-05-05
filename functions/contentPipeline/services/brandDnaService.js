const admin = require('firebase-admin');
const { VertexAI } = require('@google-cloud/vertexai');
const logger = require('firebase-functions/logger');

const db = admin.firestore();
const PROJECT_ID = 'freeflow-media';
const LOCATION = 'us-central1';

let vertexModel = null;
const getModel = () => {
  if (!vertexModel) {
    const vertex = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    vertexModel = vertex.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return vertexModel;
};

function mergeUnique(existing = [], incoming = []) {
  return [...new Set([...existing, ...incoming])].slice(0, 20);
}

async function extractSignals(feedbackText) {
  const prompt = `Parse this client feedback into brand voice signals.
Feedback: "${feedbackText}"

Return JSON only (no markdown, no code fences):
{
  "toneSignals": [],
  "avoidSignals": [],
  "preferredTopics": [],
  "avoidTopics": [],
  "platformNotes": {}
}`;

  try {
    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const text = result.response.candidates[0].content.parts[0].text;
    return JSON.parse(text);
  } catch (err) {
    logger.warn('Brand DNA signal extraction failed, skipping:', err.message);
    return { toneSignals: [], avoidSignals: [], preferredTopics: [], avoidTopics: [], platformNotes: {} };
  }
}

async function updateProfileOnRevision(clientId, brandName, feedbackText) {
  const signals = await extractSignals(feedbackText);
  const ref = db.collection('brandProfiles').doc(clientId);
  const snap = await ref.get();
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (!snap.exists) {
    await ref.set({
      clientId,
      brandName: brandName || '',
      toneSignals: signals.toneSignals,
      avoidSignals: signals.avoidSignals,
      preferredTopics: signals.preferredTopics,
      avoidTopics: signals.avoidTopics,
      platformNotes: signals.platformNotes || {},
      rawFeedbackHistory: [feedbackText],
      approvedWithoutRevision: 0,
      totalRevisions: 1,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  const data = snap.data();
  const newHistory = [...(data.rawFeedbackHistory || []), feedbackText].slice(-10);

  await ref.update({
    toneSignals: mergeUnique(data.toneSignals, signals.toneSignals),
    avoidSignals: mergeUnique(data.avoidSignals, signals.avoidSignals),
    preferredTopics: mergeUnique(data.preferredTopics, signals.preferredTopics),
    avoidTopics: mergeUnique(data.avoidTopics, signals.avoidTopics),
    platformNotes: { ...(data.platformNotes || {}), ...(signals.platformNotes || {}) },
    rawFeedbackHistory: newHistory,
    totalRevisions: admin.firestore.FieldValue.increment(1),
    updatedAt: now,
  });
}

async function updateProfileOnApproval(clientId, brandName) {
  const ref = db.collection('brandProfiles').doc(clientId);
  const snap = await ref.get();
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (!snap.exists) {
    await ref.set({
      clientId,
      brandName: brandName || '',
      toneSignals: [],
      avoidSignals: [],
      preferredTopics: [],
      avoidTopics: [],
      platformNotes: {},
      rawFeedbackHistory: [],
      approvedWithoutRevision: 1,
      totalRevisions: 0,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  await ref.update({
    approvedWithoutRevision: admin.firestore.FieldValue.increment(1),
    updatedAt: now,
  });
}

async function getProfile(clientId) {
  if (!clientId) return null;
  const snap = await db.collection('brandProfiles').doc(clientId).get();
  return snap.exists ? snap.data() : null;
}

function buildPromptPrefix(profile) {
  if (!profile) return '';
  const total = (profile.approvedWithoutRevision || 0) + (profile.totalRevisions || 0);
  if (total === 0) return '';

  const lines = [`BRAND DNA (learned from ${total} content interactions):`];
  if (profile.toneSignals?.length) lines.push(`Tone: ${profile.toneSignals.join(', ')}`);
  if (profile.avoidSignals?.length) lines.push(`Avoid: ${profile.avoidSignals.join(', ')}`);
  if (profile.preferredTopics?.length) lines.push(`Preferred topics: ${profile.preferredTopics.join(', ')}`);
  if (profile.avoidTopics?.length) lines.push(`Avoid topics: ${profile.avoidTopics.join(', ')}`);
  const recent = (profile.rawFeedbackHistory || []).slice(-3);
  if (recent.length) lines.push(`Recent client feedback: "${recent.join('" | "')}"`);
  return lines.join('\n') + '\n\n';
}

module.exports = { updateProfileOnRevision, updateProfileOnApproval, getProfile, buildPromptPrefix };
