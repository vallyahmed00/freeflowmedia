const admin = require('firebase-admin');
const axios = require('axios');
const { Resend } = require('resend');
const { GoogleGenAI } = require('@google/genai');

const db = admin.firestore();

async function getActiveClients(automationKey) {
  const snap = await db.collection('clients').where('botStatus', '==', 'active').get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => Array.isArray(c.automations) && c.automations.includes(automationKey));
}

async function sendWhatsAppToPhone(toPhone, message) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error('WhatsApp credentials not configured');
  await axios.post(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    { messaging_product: 'whatsapp', to: toPhone, type: 'text', text: { body: message } },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
}

async function sendEmailViaResend({ to, subject, html }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({ from: 'Drift Studio <hello@driftstudio.co.za>', to, subject, html });
}

async function generateWithGemini(prompt) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

module.exports = { getActiveClients, sendWhatsAppToPhone, sendEmailViaResend, generateWithGemini };
