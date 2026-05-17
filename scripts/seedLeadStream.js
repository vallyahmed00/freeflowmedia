/**
 * One-time script: seed Ahmed Vally as Lead Stream Client #1.
 *
 * Setup:
 *   1. Authenticate: firebase login (if not already logged in)
 *   2. Run: node scripts/seedLeadStream.js
 *
 * Fill in whatsapp, discordWebhook, or telegramChatId before running.
 */

const admin = require('firebase-admin');

const app = admin.initializeApp({
  projectId: 'freeflow-media',
});

const db = admin.firestore();

async function seed() {
  const doc = {
    clientName: 'Ahmed Vally',
    clientEmail: 'vallyahmed00@gmail.com',
    niche: 'SaaS',
    location: 'Johannesburg, SA',
    companySize: 'Any',
    frequency: 'weekly',
    whatsapp: '+27XXXXXXXXXX',       // Replace with your WhatsApp number (E.164 format)
    discordWebhook: null,            // Optional: set to your Discord webhook URL
    telegramChatId: null,            // Optional: set to your Telegram chat ID
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastRunAt: null,
  };

  const ref = await db.collection('leadStreamSubscriptions').add(doc);
  console.log(`✅ Created Lead Stream subscription: ${ref.id}`);
  console.log('   Fill in your real WhatsApp number in the Firestore doc to activate delivery.');
  await app.delete();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
