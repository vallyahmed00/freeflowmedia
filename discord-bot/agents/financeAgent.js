const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}
const db = admin.firestore();

async function runFinanceAgent(query = 'summary') {
  const q = query.toLowerCase();

  if (q.includes('invoice') || q.includes('unpaid')) {
    const snap = await db.collection('invoices')
      .where('status', 'in', ['unpaid', 'overdue', 'sent'])
      .orderBy('dueDate', 'asc')
      .limit(10)
      .get();

    if (snap.empty) return '✅ No unpaid invoices found.';

    const lines = snap.docs.map(d => {
      const inv = d.data();
      const due = inv.dueDate?.toDate
        ? inv.dueDate.toDate().toLocaleDateString('en-ZA')
        : 'No due date';
      return `• **${inv.clientName || 'Unknown'}** — R${(inv.total || 0).toLocaleString()} — Due: ${due} — _${inv.status}_`;
    });
    return `**Unpaid Invoices (${snap.size})**\n${lines.join('\n')}`;
  }

  if (q.includes('expense') || q.includes('spend')) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const snap = await db.collection('expenses')
      .where('date', '>=', admin.firestore.Timestamp.fromDate(startOfMonth))
      .get();
    const total = snap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
    return `**Expenses this month:** R${total.toLocaleString()} across ${snap.size} entries`;
  }

  // Default: monthly income vs expenses
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ts = admin.firestore.Timestamp.fromDate(startOfMonth);

  const [incomeSnap, expenseSnap, invoiceSnap] = await Promise.all([
    db.collection('income').where('date', '>=', ts).get(),
    db.collection('expenses').where('date', '>=', ts).get(),
    db.collection('invoices').where('status', 'in', ['unpaid', 'overdue']).get(),
  ]);

  const income = incomeSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
  const expenses = expenseSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
  const profit = income - expenses;
  const month = now.toLocaleString('en-ZA', { month: 'long', year: 'numeric' });

  return `**${month} Summary**
💰 Income: R${income.toLocaleString()}
💸 Expenses: R${expenses.toLocaleString()}
📊 Net: R${profit >= 0 ? '+' : ''}${profit.toLocaleString()}
🧾 Unpaid invoices: ${invoiceSnap.size}`;
}

module.exports = { runFinanceAgent };
