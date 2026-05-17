import {
  GENERATE_AI_LEADS_URL,
  GENERATE_OUTREACH_SCRIPT_URL,
  SEND_LEAD_ALERT_URL,
  GENERATE_OUTREACH_EMAIL_URL,
} from '../firebase/config';

export async function generateAILeads({ niche, location, companySize }) {
  const res = await fetch(GENERATE_AI_LEADS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ niche, location, companySize }),
  });
  if (!res.ok) throw new Error(`generateAILeads failed: ${res.status}`);
  const data = await res.json();
  return data.leads;
}

export async function generateOutreachEmail({ lead, tone }) {
  const res = await fetch(GENERATE_OUTREACH_EMAIL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead, tone }),
  });
  if (!res.ok) throw new Error(`generateOutreachEmail failed: ${res.status}`);
  const data = await res.json();
  return data.emailContent;
}

export async function generateOutreachScript({ lead }) {
  const res = await fetch(GENERATE_OUTREACH_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
  });
  if (!res.ok) throw new Error(`generateOutreachScript failed: ${res.status}`);
  const data = await res.json();
  return data.script;
}

export async function sendLeadAlert({ type, lead, leads, channels, niche, location, whatsappTo }) {
  const res = await fetch(SEND_LEAD_ALERT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, lead, leads, channels, niche, location, whatsappTo }),
  });
  if (!res.ok) throw new Error(`sendLeadAlert failed: ${res.status}`);
  return res.json();
}

export function exportLeadsToPDF(leads, { niche, location }) {
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(147, 51, 234);
    doc.text('Drift Studio', 14, 20);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Lead Hunter Export — ${niche} in ${location}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-ZA')}`, 14, 34);

    let y = 44;
    leads.forEach((lead, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${i + 1}. ${lead.name} — ${lead.role} @ ${lead.company}`, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      y += 5;
      doc.text(`Temperature: ${(lead.temperature || '').toUpperCase()} | Score: ${lead.score}/100 | Budget: ${lead.estimatedBudget}`, 14, y);
      y += 5;
      doc.text(`Pain: ${lead.painPoint}`, 14, y);
      y += 5;
      doc.text(`Signal: ${lead.signal}`, 14, y);
      y += 5;
      doc.text(`Best contact time: ${lead.bestContactTime}`, 14, y);
      y += 8;
    });

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('driftstudio.co.za', 14, 290);
    doc.save(`drift-leads-${(niche || 'leads').toLowerCase().replace(/\s/g, '-')}-${Date.now()}.pdf`);
  });
}
