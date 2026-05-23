const admin = require('firebase-admin');

if (!admin.apps.length) {
  const credential = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? admin.credential.cert(JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON))
    : admin.credential.applicationDefault();
  admin.initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID });
}
const db = admin.firestore();

async function runLeadsAgent(status = 'all') {
  let snap;

  if (status !== 'all') {
    snap = await db.collection('leads')
      .where('status', '==', status)
      .limit(50)
      .get();

    if (snap.empty) return `No leads found with status **${status}**.`;

    const sorted = snap.docs
      .sort((a, b) => {
        const aTime = a.data().createdAt?.toMillis?.() ?? 0;
        const bTime = b.data().createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 15);

    const lines = sorted.map(d => {
      const l = d.data();
      const contact = l.email || l.phone || 'no contact';
      return `• **${l.business_name || 'Unknown'}** — ${contact} — _${l.source || 'manual'}_`;
    });
    return `**${status.charAt(0).toUpperCase() + status.slice(1)} Leads (${snap.size})**\n${lines.join('\n')}`;
  }

  // Full summary with counts per status
  snap = await db.collection('leads').get();
  if (snap.empty) return 'No leads in the pipeline yet.';

  const counts = {};
  snap.docs.forEach(d => {
    const s = d.data().status || 'unknown';
    counts[s] = (counts[s] || 0) + 1;
  });

  const order = ['new', 'contacted', 'interested', 'follow_up', 'converted', 'not_interested'];
  const lines = order
    .filter(s => counts[s])
    .map(s => `• **${s.replace('_', ' ')}:** ${counts[s]}`);

  const other = Object.entries(counts)
    .filter(([s]) => !order.includes(s))
    .map(([s, n]) => `• **${s}:** ${n}`);

  return `**Lead Pipeline — ${snap.size} total**\n${[...lines, ...other].join('\n')}`;
}

module.exports = { runLeadsAgent };
