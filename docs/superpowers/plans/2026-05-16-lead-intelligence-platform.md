# Lead Intelligence Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `/generate` (Generator.jsx) from a lead CRM list into a 3-tab Lead Intelligence Platform with AI-generated prospects, outreach email, and sales script generation — plus a schedulable Lead Stream service sold as a Drift Studio add-on.

**Architecture:** 4 new Cloud Functions appended to `functions/index.js` (Gemini 1.5 Flash via existing `getAI()`); new service module `leadHunterService.js` handles all client-side API calls; Generator.jsx rewritten as a tab shell rendering three standalone tab page components.

**Tech Stack:** React 19, Vite, Firebase Cloud Functions v2, Firestore, Gemini 1.5 Flash, Framer Motion, Lucide React, jsPDF, react-hot-toast, Twilio WhatsApp, Discord webhook, Telegram Bot API.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `functions/index.js` | Modify (append) | 4 new Cloud Functions |
| `src/firebase/config.js` | Modify | Add 4 new function URLs |
| `src/services/leadHunterService.js` | Create | All fetch calls + PDF export |
| `src/components/ScoreRing.jsx` | Create | SVG circular score ring |
| `src/components/LeadCard.jsx` | Rewrite | AI action buttons (Discord/Telegram/WhatsApp/PDF/Use) |
| `src/pages/LeadHunterTab.jsx` | Create | Niche grid, controls, settings panel, lead cards |
| `src/pages/OutreachEmailTab.jsx` | Create | Lead banner, tone selector, email output, share actions |
| `src/pages/SalesScriptTab.jsx` | Create | Collapsible script sections, share actions |
| `src/pages/Generator.jsx` | Rewrite | Tab shell with AnimatePresence |
| `src/pages/Generator.css` | Modify | Tab styles, niche grid, score ring, settings panel |
| `src/pages/Pricing.jsx` | Modify | Add Lead Stream add-on card |
| `package.json` | Modify | Fix homepage field |
| `scripts/seedLeadStream.js` | Create | One-time seed for Ahmed as Client #1 |

---

## Task 1: Cloud Function — generateAILeads

**Files:**
- Modify: `functions/index.js` (append after line 848)

- [ ] **Step 1: Append `generateAILeads` to functions/index.js**

Add this block to the very end of `functions/index.js` (after the closing `);` of `requestTestimonial`):

```js
// ==================== LEAD INTELLIGENCE PLATFORM ====================

exports.generateAILeads = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const { niche = "SaaS", location = "Johannesburg, SA", companySize = "Any" } = req.body;

      const prompt = `Generate exactly 5 fictional but plausible business leads for a sales professional targeting the ${niche} industry in ${location}.
${companySize !== "Any" ? `Company size filter: ${companySize} employees.` : ""}

Return ONLY a valid JSON array with exactly 5 objects. Each object must have these exact keys:
{
  "name": "Full Name",
  "role": "Job Title",
  "company": "Company Name",
  "painPoint": "One specific business pain point (max 15 words)",
  "signal": "One buying signal or trigger event (max 15 words)",
  "score": <integer 50-99>,
  "temperature": "hot" | "warm" | "cold",
  "estimatedBudget": "e.g. R15k–R30k/month",
  "bestContactTime": "e.g. Tuesday 10am–12pm"
}

Rules:
- Names must sound like real South African or international professionals
- Pain points must be specific to ${niche}
- Signals must be actionable buying triggers (hiring, funding, rebranding, etc.)
- Score 85+ = hot, 70–84 = warm, 50–69 = cold (must be consistent with temperature)
- No markdown, no explanation, ONLY the JSON array`;

      try {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const text = response.candidates[0].content.parts[0].text.trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("No JSON array found in Gemini response");
        const leads = JSON.parse(jsonMatch[0]);

        const saved = [];
        for (const lead of leads) {
          const docRef = await db.collection("leads").add({
            ...lead,
            source: "ai_hunter",
            niche,
            location,
            companySize,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          saved.push({ id: docRef.id, ...lead });
        }

        logger.info(`generateAILeads: saved ${saved.length} leads for ${niche} in ${location}`);
        return res.status(200).json({ leads: saved });
      } catch (error) {
        logger.error("generateAILeads error:", error);
        return res.status(500).json({ error: "Failed to generate leads", details: error.message });
      }
    });
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add functions/index.js
git commit -m "feat: add generateAILeads Cloud Function (Gemini 1.5 Flash)"
```

---

## Task 2: Cloud Function — generateOutreachScript

**Files:**
- Modify: `functions/index.js` (append)

- [ ] **Step 1: Append `generateOutreachScript` to functions/index.js**

```js
exports.generateOutreachScript = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const { lead } = req.body;
      if (!lead) return res.status(400).json({ error: "lead is required" });

      const prompt = `Write a phone sales script for reaching out to ${lead.name}, ${lead.role} at ${lead.company}.

Their main pain point: ${lead.painPoint}
Buying signal: ${lead.signal}
Estimated budget: ${lead.estimatedBudget}

Return ONLY a valid JSON object with these exact keys. Each value is a short script segment (2-5 sentences):
{
  "opener": "Natural cold-call opening that references the signal without being creepy",
  "rapport": "1-2 lines to build quick connection. Ask one open question",
  "painAgitation": "Agitate the pain point. Make them feel it. No corporate language",
  "solutionPitch": "Pitch Drift Studio's solution to their specific pain. Concrete, brief",
  "objectionPrice": "Handle price objection naturally. Reference ROI or risk of inaction",
  "objectionNotInterested": "Handle 'not interested' with a disarming pivot",
  "close": "Ask for the next step. Specific, low-pressure ask"
}

Style rules:
- Use contractions throughout (I'm, we've, don't, it's, you're)
- Include [PAUSE] and [LISTEN] cues inline where natural
- Mix short punchy lines with longer ones
- Zero corporate buzzwords (no 'synergy', 'leverage', 'solutions')
- Sound like a real human conversation, not a robot
- No markdown, no explanation, ONLY the JSON object`;

      try {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const text = response.candidates[0].content.parts[0].text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON object found in response");
        const script = JSON.parse(jsonMatch[0]);
        return res.status(200).json({ script });
      } catch (error) {
        logger.error("generateOutreachScript error:", error);
        return res.status(500).json({ error: "Failed to generate script", details: error.message });
      }
    });
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add functions/index.js
git commit -m "feat: add generateOutreachScript Cloud Function"
```

---

## Task 3: Cloud Function — sendLeadAlert

**Files:**
- Modify: `functions/index.js` (append)

- [ ] **Step 1: Append `sendLeadAlert` to functions/index.js**

```js
exports.sendLeadAlert = onRequest(
  {
    secrets: [
      "DISCORD_WEBHOOK_URL",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_CHAT_ID",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_WHATSAPP_FROM",
    ],
    cors: true,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const { type, lead, leads, channels = [], niche, location } = req.body;

      const formatSingleLead = (l) =>
        `🎯 *New Lead — ${l.company}*\n` +
        `👤 ${l.name} | ${l.role}\n` +
        `🔥 ${(l.temperature || "").toUpperCase()} | Score: ${l.score}/100\n` +
        `💢 Pain: ${l.painPoint}\n` +
        `📡 Signal: ${l.signal}\n` +
        `💰 Budget: ${l.estimatedBudget}\n` +
        `🕐 Best time: ${l.bestContactTime}\n` +
        `\n_Drift Studio Lead Hunter — driftstudio.co.za_`;

      const formatBatch = (ls, n, loc) => {
        const header = `🎯 *${ls.length} New AI Leads — ${n} in ${loc}*\n\n`;
        const items = ls
          .map(
            (l, i) =>
              `*${i + 1}. ${l.name} @ ${l.company}*\n` +
              `   ${l.role} | ${(l.temperature || "").toUpperCase()} ${l.score}/100\n` +
              `   Pain: ${l.painPoint}`
          )
          .join("\n\n");
        return header + items + "\n\n_Powered by Drift Studio — driftstudio.co.za_";
      };

      const message =
        type === "batch"
          ? formatBatch(leads || [], niche || "General", location || "SA")
          : formatSingleLead(lead || {});

      const results = {};

      if (channels.includes("discord")) {
        try {
          const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
          if (webhookUrl) {
            await axios.post(webhookUrl, { content: message.replace(/\*/g, "**") });
            results.discord = "sent";
          }
        } catch (e) {
          logger.error("Discord send failed:", e.message);
          results.discord = "failed";
        }
      }

      if (channels.includes("telegram")) {
        try {
          const token = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID;
          if (token && chatId) {
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
              chat_id: chatId,
              text: message,
              parse_mode: "Markdown",
            });
            results.telegram = "sent";
          }
        } catch (e) {
          logger.error("Telegram send failed:", e.message);
          results.telegram = "failed";
        }
      }

      if (channels.includes("whatsapp") && req.body.whatsappTo) {
        try {
          const sid = process.env.TWILIO_ACCOUNT_SID;
          const token = process.env.TWILIO_AUTH_TOKEN;
          const from = process.env.TWILIO_WHATSAPP_FROM;
          if (sid && token && from) {
            const body = encodeURIComponent(message.replace(/\*/g, ""));
            await axios.post(
              `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
              `From=whatsapp:${from}&To=whatsapp:${req.body.whatsappTo}&Body=${body}`,
              {
                auth: { username: sid, password: token },
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
              }
            );
            results.whatsapp = "sent";
          }
        } catch (e) {
          logger.error("WhatsApp send failed:", e.message);
          results.whatsapp = "failed";
        }
      }

      return res.status(200).json({ success: true, results });
    });
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add functions/index.js
git commit -m "feat: add sendLeadAlert Cloud Function (Discord + Telegram + WhatsApp)"
```

---

## Task 4: Cloud Function — processLeadStreams (scheduled)

**Files:**
- Modify: `functions/index.js` (append)

- [ ] **Step 1: Append `processLeadStreams` to functions/index.js**

```js
exports.processLeadStreams = onSchedule(
  {
    schedule: "0 6 * * 1",
    timeZone: "Africa/Johannesburg",
    secrets: [
      "GEMINI_API_KEY",
      "DISCORD_WEBHOOK_URL",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_CHAT_ID",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_WHATSAPP_FROM",
    ],
  },
  async () => {
    const snapshot = await db
      .collection("leadStreamSubscriptions")
      .where("active", "==", true)
      .get();

    if (snapshot.empty) {
      logger.info("processLeadStreams: no active subscriptions");
      return;
    }

    const generateForSubscription = async (sub) => {
      const { niche, location, companySize = "Any", clientName, whatsapp, discordWebhook, telegramChatId } = sub;
      const prompt = `Generate exactly 5 fictional but plausible business leads for a sales professional targeting the ${niche} industry in ${location}.
${companySize !== "Any" ? `Company size filter: ${companySize} employees.` : ""}
Return ONLY a valid JSON array with exactly 5 objects with keys: name, role, company, painPoint, signal, score (50-99), temperature (hot/warm/cold), estimatedBudget, bestContactTime.
No markdown, no explanation, ONLY the JSON array.`;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const text = response.candidates[0].content.parts[0].text.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array in response");
      const leads = JSON.parse(jsonMatch[0]);

      for (const lead of leads) {
        await db.collection("leads").add({
          ...lead,
          source: "lead_stream",
          clientName,
          niche,
          location,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const formatWeeklyMessage = (ls) => {
        const header = `🎯 Weekly Leads — ${niche} in ${location}\n\n`;
        const items = ls
          .map(
            (l, i) =>
              `${i + 1}. ${l.name} @ ${l.company}\n` +
              `   Role: ${l.role}\n` +
              `   Pain: ${l.painPoint}\n` +
              `   Score: ${l.score}/100 | ${(l.temperature || "").toUpperCase()}\n` +
              `   Budget: ${l.estimatedBudget}\n` +
              `   Best time: ${l.bestContactTime}`
          )
          .join("\n\n");
        return header + items + "\n\nPowered by Drift Studio Lead Stream\ndriftstudio.co.za";
      };

      const message = formatWeeklyMessage(leads);

      if (whatsapp) {
        try {
          const sid = process.env.TWILIO_ACCOUNT_SID;
          const token = process.env.TWILIO_AUTH_TOKEN;
          const from = process.env.TWILIO_WHATSAPP_FROM;
          const body = encodeURIComponent(message);
          await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
            `From=whatsapp:${from}&To=whatsapp:${whatsapp}&Body=${body}`,
            {
              auth: { username: sid, password: token },
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
          );
        } catch (e) {
          logger.error(`Lead Stream WhatsApp failed for ${clientName}:`, e.message);
        }
      }

      if (discordWebhook) {
        try {
          await axios.post(discordWebhook, { content: message });
        } catch (e) {
          logger.error(`Lead Stream Discord failed for ${clientName}:`, e.message);
        }
      }

      if (telegramChatId) {
        try {
          const token = process.env.TELEGRAM_BOT_TOKEN;
          await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: telegramChatId,
            text: message,
          });
        } catch (e) {
          logger.error(`Lead Stream Telegram failed for ${clientName}:`, e.message);
        }
      }
    };

    for (const doc of snapshot.docs) {
      try {
        await generateForSubscription(doc.data());
        await doc.ref.update({ lastRunAt: admin.firestore.FieldValue.serverTimestamp() });
        logger.info(`Lead Stream processed for: ${doc.data().clientName}`);
      } catch (e) {
        logger.error(`Lead Stream failed for doc ${doc.id}:`, e.message);
      }
    }
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add functions/index.js
git commit -m "feat: add processLeadStreams scheduled function (Monday 8am SAST)"
```

---

## Task 5: Set Firebase Secrets and Deploy Functions

**Files:**
- `functions/index.js` (already modified)

- [ ] **Step 1: Set required secrets**

Run each command and enter the value when prompted:

```bash
cd functions
firebase functions:secrets:set DISCORD_WEBHOOK_URL
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_WHATSAPP_FROM
```

Values needed:
- `DISCORD_WEBHOOK_URL` — from Discord server → Edit Channel → Integrations → Webhooks
- `TELEGRAM_BOT_TOKEN` — from @BotFather on Telegram
- `TELEGRAM_CHAT_ID` — your chat ID (find via `https://api.telegram.org/bot<TOKEN>/getUpdates` after sending /start)
- `TWILIO_ACCOUNT_SID` — from Twilio console
- `TWILIO_AUTH_TOKEN` — from Twilio console
- `TWILIO_WHATSAPP_FROM` — Twilio WhatsApp sandbox number e.g. `+14155238886`

- [ ] **Step 2: Deploy only the new functions**

```bash
cd ..
firebase deploy --only functions:generateAILeads,functions:generateOutreachScript,functions:sendLeadAlert,functions:processLeadStreams
```

- [ ] **Step 3: Note the deployed URLs**

After deployment, note the URLs printed. They follow this pattern:
```
https://us-central1-freeflow-media.cloudfunctions.net/generateAILeads
https://us-central1-freeflow-media.cloudfunctions.net/generateOutreachScript
https://us-central1-freeflow-media.cloudfunctions.net/sendLeadAlert
```

---

## Task 6: Config URLs + Service Module

**Files:**
- Modify: `src/firebase/config.js`
- Create: `src/services/leadHunterService.js`

- [ ] **Step 1: Add URLs to src/firebase/config.js**

Replace the last two lines of `src/firebase/config.js`:
```js
export const APIFY_API_KEY = import.meta.env.VITE_APIFY_API_KEY || "";
export const GENERATE_STRATEGY_URL = "https://us-central1-freeflow-media.cloudfunctions.net/generateStrategy";
export default app;
```

With:
```js
export const APIFY_API_KEY = import.meta.env.VITE_APIFY_API_KEY || "";
export const GENERATE_STRATEGY_URL = "https://us-central1-freeflow-media.cloudfunctions.net/generateStrategy";
export const GENERATE_AI_LEADS_URL = "https://us-central1-freeflow-media.cloudfunctions.net/generateAILeads";
export const GENERATE_OUTREACH_SCRIPT_URL = "https://us-central1-freeflow-media.cloudfunctions.net/generateOutreachScript";
export const SEND_LEAD_ALERT_URL = "https://us-central1-freeflow-media.cloudfunctions.net/sendLeadAlert";
export const GENERATE_OUTREACH_EMAIL_URL = "https://us-central1-freeflow-media.cloudfunctions.net/generateOutreachEmail";
export default app;
```

- [ ] **Step 2: Create src/services/leadHunterService.js**

```js
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
      doc.text(`Temperature: ${lead.temperature?.toUpperCase()} | Score: ${lead.score}/100 | Budget: ${lead.estimatedBudget}`, 14, y);
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
    doc.save(`drift-leads-${niche.toLowerCase().replace(/\s/g, '-')}-${Date.now()}.pdf`);
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/firebase/config.js src/services/leadHunterService.js
git commit -m "feat: add function URLs to config and create leadHunterService"
```

---

## Task 7: ScoreRing Component

**Files:**
- Create: `src/components/ScoreRing.jsx`

- [ ] **Step 1: Create src/components/ScoreRing.jsx**

```jsx
export default function ScoreRing({ score }) {
  const radius = 20;
  const stroke = 3;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 85 ? '#ef4444' :
    score >= 70 ? '#f59e0b' :
    '#3b82f6';

  return (
    <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
      <svg height={44} width={44} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={22}
          cy={22}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={22}
          cy={22}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.65rem', fontWeight: 700, color,
      }}>
        {score}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ScoreRing.jsx
git commit -m "feat: add ScoreRing SVG component"
```

---

## Task 8: Rewrite LeadCard with AI Actions

**Files:**
- Rewrite: `src/components/LeadCard.jsx`

> Note: The existing LeadCard is for the CRM pipeline. The new version needs to support both the old CRM usage (when `aiMode` is false) and the new AI Lead Hunter usage (when `aiMode` is true).

- [ ] **Step 1: Read current LeadCard.jsx**

```bash
cat src/components/LeadCard.jsx | head -60
```

- [ ] **Step 2: Rewrite src/components/LeadCard.jsx**

Replace the full file with:

```jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Phone, Globe, ChevronDown, ChevronUp,
  MessageSquare, Send, FileText, ArrowRight,
  Star, Trash2, Edit3
} from 'lucide-react';
import ScoreRing from './ScoreRing';
import toast from 'react-hot-toast';

const TEMP_BADGE = {
  hot:  { emoji: '🔴', label: 'Hot',  bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  warm: { emoji: '🟡', label: 'Warm', bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  cold: { emoji: '🔵', label: 'Cold', bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
};

export default function LeadCard({
  lead,
  aiMode = false,
  index = 0,
  onUseLead,
  onSendAlert,
  onDelete,
  onEdit,
  onStatusChange,
}) {
  const [expanded, setExpanded] = useState(false);

  if (aiMode) {
    const temp = TEMP_BADGE[lead.temperature] || TEMP_BADGE.cold;
    const whatsappText = encodeURIComponent(
      `Hi ${lead.name},\n\nI came across ${lead.company} and noticed you might be dealing with ${lead.painPoint}.\n\nI'd love to share how Drift Studio has helped similar ${lead.temperature === 'hot' ? 'high-growth' : ''} businesses.\n\nWorth a quick chat?`
    );

    return (
      <motion.div
        className="ai-lead-card glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
      >
        <div className="ai-lead-header">
          <div className="ai-lead-identity">
            <div className="ai-lead-name">{lead.name}</div>
            <div className="ai-lead-role">{lead.role} @ {lead.company}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="temp-badge" style={{ background: temp.bg, color: temp.color }}>
              {temp.emoji} {temp.label}
            </span>
            <ScoreRing score={lead.score} />
          </div>
        </div>

        <div className="ai-lead-body">
          <p className="ai-lead-pain">💢 {lead.painPoint}</p>
          <p className="ai-lead-signal">📡 {lead.signal}</p>
          <div className="ai-lead-meta">
            <span>💰 {lead.estimatedBudget}</span>
            <span>🕐 {lead.bestContactTime}</span>
          </div>
        </div>

        <div className="ai-lead-actions">
          <button
            className="ai-action-btn"
            title="Post to Discord"
            onClick={() => onSendAlert?.({ type: 'single', lead, channels: ['discord'] })}
          >
            <MessageSquare size={14} /> Discord
          </button>
          <button
            className="ai-action-btn"
            title="Send to Telegram"
            onClick={() => onSendAlert?.({ type: 'single', lead, channels: ['telegram'] })}
          >
            <Send size={14} /> Telegram
          </button>
          <a
            className="ai-action-btn"
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageSquare size={14} /> WhatsApp
          </a>
          <button
            className="ai-action-btn ai-action-use"
            onClick={() => onUseLead?.(lead)}
          >
            Use lead <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    );
  }

  // CRM mode (original behaviour)
  const statusColors = {
    new: '#3b82f6', contacted: '#f59e0b', interested: '#22c55e',
    proposal: '#a855f7', won: '#10b981', lost: '#ef4444',
  };

  return (
    <div className="lead-card glass-card">
      <div className="lead-card-header">
        <div>
          <h3 className="lead-card-name">{lead.business_name || lead.company}</h3>
          <span className="lead-card-industry">{lead.industry || lead.niche}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {lead.status && (
            <span
              className="status-badge"
              style={{ background: `${statusColors[lead.status] || '#6b7280'}22`, color: statusColors[lead.status] || '#6b7280' }}
            >
              {lead.status}
            </span>
          )}
          {onDelete && (
            <button className="icon-btn" onClick={() => onDelete(lead.id)} title="Delete">
              <Trash2 size={14} />
            </button>
          )}
          {onEdit && (
            <button className="icon-btn" onClick={() => onEdit(lead)} title="Edit">
              <Edit3 size={14} />
            </button>
          )}
          <button className="icon-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className="lead-card-meta">
        {lead.location && <span>📍 {lead.location}</span>}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="lead-contact-link">
            <Mail size={12} /> {lead.email}
          </a>
        )}
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="lead-contact-link">
            <Phone size={12} /> {lead.phone}
          </a>
        )}
      </div>

      {expanded && lead.notes && (
        <div className="lead-card-notes">{lead.notes}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/LeadCard.jsx
git commit -m "feat: rewrite LeadCard with AI mode actions (Discord/Telegram/WhatsApp/Use)"
```

---

## Task 9: LeadHunterTab

**Files:**
- Create: `src/pages/LeadHunterTab.jsx`

- [ ] **Step 1: Create src/pages/LeadHunterTab.jsx**

```jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Settings, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import LeadCard from '../components/LeadCard';
import { generateAILeads, sendLeadAlert, exportLeadsToPDF } from '../services/leadHunterService';

const NICHES = [
  'E-commerce', 'Restaurants', 'Real Estate',
  'Fitness', 'Law Firms', 'SaaS',
  'Dental', 'Coaches', 'Retail',
];

const SIZES = ['Any', '1–10', '11–50', '51–200'];

const SETTINGS_KEY = 'drift_lead_notify_settings';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { discord: false, telegram: false, whatsapp: false, whatsappNumber: '' };
  } catch {
    return { discord: false, telegram: false, whatsapp: false, whatsappNumber: '' };
  }
}

export default function LeadHunterTab({ onUseLead }) {
  const [niche, setNiche] = useState('SaaS');
  const [location, setLocation] = useState('Johannesburg, SA');
  const [companySize, setCompanySize] = useState('Any');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifySettings, setNotifySettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(notifySettings));
  }, [notifySettings]);

  const hotCount = leads.filter(l => l.temperature === 'hot').length;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const newLeads = await generateAILeads({ niche, location, companySize });
      setLeads(prev => [...newLeads, ...prev]);
      toast.success(`5 leads generated for ${niche} in ${location}`);

      const channels = [];
      if (notifySettings.discord) channels.push('discord');
      if (notifySettings.telegram) channels.push('telegram');
      if (channels.length > 0) {
        await sendLeadAlert({ type: 'batch', leads: newLeads, channels, niche, location });
      }
    } catch (err) {
      toast.error('Failed to generate leads. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlert = async ({ type, lead, channels }) => {
    try {
      await sendLeadAlert({
        type,
        lead,
        channels,
        whatsappTo: notifySettings.whatsappNumber || undefined,
      });
      toast.success(`Sent to ${channels.join(' & ')}`);
    } catch {
      toast.error('Failed to send alert');
    }
  };

  const handleExportPDF = () => {
    if (leads.length === 0) return toast.error('Generate leads first');
    exportLeadsToPDF(leads, { niche, location });
    toast.success('PDF downloaded');
  };

  return (
    <div className="lead-hunter-tab">
      {/* Settings panel */}
      <div className="lead-hunter-topbar">
        <h2 className="tab-section-title">Lead Hunter</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {leads.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleExportPDF}>
              <FileText size={14} /> PDF
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(o => !o)}>
            <Settings size={14} /> Settings
          </button>
        </div>
      </div>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="settings-panel glass-card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="settings-panel-header">
              <span>Notification Channels</span>
              <button className="icon-btn" onClick={() => setSettingsOpen(false)}><X size={14} /></button>
            </div>
            <div className="settings-toggles">
              {['discord', 'telegram'].map(ch => (
                <label key={ch} className="settings-toggle">
                  <span style={{ textTransform: 'capitalize' }}>{ch}</span>
                  <input
                    type="checkbox"
                    checked={notifySettings[ch]}
                    onChange={e => setNotifySettings(s => ({ ...s, [ch]: e.target.checked }))}
                  />
                </label>
              ))}
              <label className="settings-toggle">
                <span>WhatsApp</span>
                <input
                  type="checkbox"
                  checked={notifySettings.whatsapp}
                  onChange={e => setNotifySettings(s => ({ ...s, whatsapp: e.target.checked }))}
                />
              </label>
              {notifySettings.whatsapp && (
                <input
                  className="settings-input"
                  type="tel"
                  placeholder="+27 82 000 0000"
                  value={notifySettings.whatsappNumber}
                  onChange={e => setNotifySettings(s => ({ ...s, whatsappNumber: e.target.value }))}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Niche grid */}
      <div className="niche-grid">
        {NICHES.map(n => (
          <button
            key={n}
            className={`niche-tile ${niche === n ? 'niche-tile--active' : ''}`}
            onClick={() => setNiche(n)}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div className="hunter-controls">
        <input
          className="hunter-input"
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Location"
        />
        <select
          className="hunter-select"
          value={companySize}
          onChange={e => setCompanySize(e.target.value)}
        >
          {SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="spin-icon" /> : null}
          {loading ? 'Generating...' : 'Generate 5 Leads'}
        </button>
      </div>

      {/* Stats strip */}
      {leads.length > 0 && (
        <div className="stats-strip">
          <span>{leads.length} generated this session</span>
          <span>{hotCount} hot prospects</span>
          <span>{leads.length} saved to pipeline</span>
        </div>
      )}

      {/* Lead cards */}
      <div className="ai-leads-grid">
        <AnimatePresence>
          {leads.map((lead, i) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              aiMode
              index={i}
              onUseLead={onUseLead}
              onSendAlert={handleSendAlert}
            />
          ))}
        </AnimatePresence>
      </div>

      {leads.length === 0 && !loading && (
        <div className="empty-state">
          <p>Select a niche and generate leads to get started.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/LeadHunterTab.jsx
git commit -m "feat: create LeadHunterTab with niche grid, settings panel, and lead cards"
```

---

## Task 10: OutreachEmailTab

**Files:**
- Create: `src/pages/OutreachEmailTab.jsx`

- [ ] **Step 1: Create src/pages/OutreachEmailTab.jsx**

```jsx
import { useState } from 'react';
import { Loader2, Copy, RefreshCw, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateOutreachEmail, sendLeadAlert } from '../services/leadHunterService';

const TONES = ['Professional', 'Casual', 'Direct'];

export default function OutreachEmailTab({ selectedLead, onChangeLeadClick }) {
  const [tone, setTone] = useState('Professional');
  const [emailContent, setEmailContent] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedLead) return;
    setLoading(true);
    try {
      const content = await generateOutreachEmail({ lead: selectedLead, tone });
      const lines = content.split('\n').filter(Boolean);
      const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
      if (subjectLine) {
        setSubject(subjectLine.replace(/^subject:\s*/i, ''));
        setEmailContent(lines.filter(l => !l.toLowerCase().startsWith('subject:')).join('\n'));
      } else {
        setSubject('');
        setEmailContent(content);
      }
    } catch {
      toast.error('Failed to generate email');
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    const text = subject ? `Subject: ${subject}\n\n${emailContent}` : emailContent;
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
  };

  const shareDiscord = async () => {
    try {
      await sendLeadAlert({
        type: 'single',
        lead: { ...selectedLead, painPoint: `EMAIL DRAFT:\n\nSubject: ${subject}\n\n${emailContent}` },
        channels: ['discord'],
      });
      toast.success('Draft posted to Discord');
    } catch {
      toast.error('Failed to post to Discord');
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Subject: ${subject}\n\n${emailContent}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareiMessage = () => {
    const text = encodeURIComponent(`Subject: ${subject}\n\n${emailContent}`);
    window.open(`sms:?body=${text}`);
  };

  if (!selectedLead) {
    return (
      <div className="empty-state">
        <p>Select a lead from the Lead Hunter tab to generate an outreach email.</p>
      </div>
    );
  }

  return (
    <div className="outreach-tab">
      <div className="selected-lead-banner">
        <div>
          <div className="selected-lead-name">{selectedLead.name} — {selectedLead.company}</div>
          <div className="selected-lead-pain">{selectedLead.painPoint}</div>
        </div>
        <button className="btn-link" onClick={onChangeLeadClick}>Change lead</button>
      </div>

      <div className="tone-selector">
        {TONES.map(t => (
          <button
            key={t}
            className={`tone-btn ${tone === t ? 'tone-btn--active' : ''}`}
            onClick={() => setTone(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
        {loading ? <Loader2 size={16} className="spin-icon" /> : null}
        {loading ? 'Generating...' : 'Generate Email'}
      </button>

      {emailContent && (
        <div className="email-output">
          <input
            className="email-subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject line..."
          />
          <textarea
            className="email-body"
            value={emailContent}
            onChange={e => setEmailContent(e.target.value)}
            rows={10}
          />
          <div className="output-actions">
            <button className="btn btn-ghost btn-sm" onClick={copyAll}>
              <Copy size={14} /> Copy
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleGenerate} disabled={loading}>
              <RefreshCw size={14} /> Regenerate
            </button>
            <button className="btn btn-ghost btn-sm" onClick={shareDiscord}>
              <MessageSquare size={14} /> Discord
            </button>
            <button className="btn btn-ghost btn-sm" onClick={shareWhatsApp}>
              <MessageSquare size={14} /> WhatsApp
            </button>
            <button className="btn btn-ghost btn-sm" onClick={shareiMessage}>
              <Send size={14} /> iMessage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/OutreachEmailTab.jsx
git commit -m "feat: create OutreachEmailTab with tone selector and share actions"
```

---

## Task 11: SalesScriptTab

**Files:**
- Create: `src/pages/SalesScriptTab.jsx`

- [ ] **Step 1: Create src/pages/SalesScriptTab.jsx**

```jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Copy, RefreshCw, ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateOutreachScript, sendLeadAlert } from '../services/leadHunterService';

const SECTIONS = [
  { key: 'opener',               label: '1. Opener' },
  { key: 'rapport',              label: '2. Rapport' },
  { key: 'painAgitation',        label: '3. Pain Agitation' },
  { key: 'solutionPitch',        label: '4. Solution Pitch' },
  { key: 'objectionPrice',       label: '5. Objection: Price' },
  { key: 'objectionNotInterested', label: '6. Objection: Not Interested' },
  { key: 'close',                label: '7. Close' },
];

function ScriptSection({ label, content }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="script-section">
      <button className="script-section-header" onClick={() => setOpen(o => !o)}>
        <span>{label}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="script-section-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p>{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SalesScriptTab({ selectedLead, onChangeLeadClick }) {
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedLead) return;
    setLoading(true);
    try {
      const s = await generateOutreachScript({ lead: selectedLead });
      setScript(s);
    } catch {
      toast.error('Failed to generate script');
    } finally {
      setLoading(false);
    }
  };

  const copyScript = () => {
    if (!script) return;
    const text = SECTIONS.map(s => `${s.label}\n${script[s.key]}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => toast.success('Script copied!'));
  };

  const shareDiscord = async () => {
    if (!script) return;
    const text = SECTIONS.map(s => `**${s.label}**\n${script[s.key]}`).join('\n\n');
    try {
      await sendLeadAlert({
        type: 'single',
        lead: { ...selectedLead, painPoint: text },
        channels: ['discord'],
      });
      toast.success('Script posted to Discord');
    } catch {
      toast.error('Failed to post to Discord');
    }
  };

  const shareWhatsApp = () => {
    if (!script) return;
    const text = encodeURIComponent(
      SECTIONS.map(s => `${s.label}\n${script[s.key]}`).join('\n\n')
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!selectedLead) {
    return (
      <div className="empty-state">
        <p>Select a lead from the Lead Hunter tab to generate a sales script.</p>
      </div>
    );
  }

  return (
    <div className="script-tab">
      <div className="selected-lead-banner">
        <div>
          <div className="selected-lead-name">{selectedLead.name} — {selectedLead.company}</div>
          <div className="selected-lead-pain">{selectedLead.painPoint}</div>
        </div>
        <button className="btn-link" onClick={onChangeLeadClick}>Change lead</button>
      </div>

      <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
        {loading ? <Loader2 size={16} className="spin-icon" /> : null}
        {loading ? 'Generating...' : 'Generate Script'}
      </button>

      {script && (
        <>
          <div className="script-sections">
            {SECTIONS.map(s => (
              <ScriptSection key={s.key} label={s.label} content={script[s.key]} />
            ))}
          </div>
          <div className="output-actions">
            <button className="btn btn-ghost btn-sm" onClick={copyScript}>
              <Copy size={14} /> Copy Full Script
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleGenerate} disabled={loading}>
              <RefreshCw size={14} /> Regenerate
            </button>
            <button className="btn btn-ghost btn-sm" onClick={shareDiscord}>
              <MessageSquare size={14} /> Discord
            </button>
            <button className="btn btn-ghost btn-sm" onClick={shareWhatsApp}>
              <Send size={14} /> WhatsApp
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/SalesScriptTab.jsx
git commit -m "feat: create SalesScriptTab with collapsible Framer Motion sections"
```

---

## Task 12: Rewrite Generator.jsx as Tab Shell

**Files:**
- Rewrite: `src/pages/Generator.jsx`
- Modify: `src/pages/Generator.css`

- [ ] **Step 1: Rewrite src/pages/Generator.jsx**

```jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import LeadHunterTab from './LeadHunterTab';
import OutreachEmailTab from './OutreachEmailTab';
import SalesScriptTab from './SalesScriptTab';
import './Generator.css';

const TABS = [
  { id: 'hunter', label: '🎯 Lead Hunter' },
  { id: 'email',  label: '✉️ Outreach Email' },
  { id: 'script', label: '📞 Sales Script' },
];

export default function Generator() {
  const [activeTab, setActiveTab] = useState('hunter');
  const [selectedLead, setSelectedLead] = useState(null);

  const handleUseLead = (lead) => {
    setSelectedLead(lead);
    setActiveTab('email');
  };

  const handleChangeLead = () => {
    setActiveTab('hunter');
  };

  return (
    <div className="generator-page">
      <Toaster position="top-right" />
      <div className="container">
        <div className="generator-header">
          <h1 className="page-title gradient-text">Lead Intelligence</h1>
          <p className="page-subtitle">AI-powered prospect discovery, outreach, and sales scripts</p>
        </div>

        <div className="tab-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="tab-content"
          >
            {activeTab === 'hunter' && (
              <LeadHunterTab onUseLead={handleUseLead} />
            )}
            {activeTab === 'email' && (
              <OutreachEmailTab
                selectedLead={selectedLead}
                onChangeLeadClick={handleChangeLead}
              />
            )}
            {activeTab === 'script' && (
              <SalesScriptTab
                selectedLead={selectedLead}
                onChangeLeadClick={handleChangeLead}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update Generator.css — append tab + hunter styles**

Read the current Generator.css first, then append these styles at the end:

```css
/* === GENERATOR PAGE === */
.generator-page {
  min-height: 100vh;
  padding-top: clamp(5rem, 10vw, 8rem);
  padding-bottom: 4rem;
}

.generator-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-subtitle {
  color: var(--text-muted);
  font-size: 1rem;
  margin-top: 0.5rem;
}

/* === TABS === */
.tab-bar {
  display: flex;
  gap: 0.25rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 0.35rem;
  margin-bottom: 2rem;
}

.tab-btn {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-btn--active {
  background: var(--primary-color);
  color: white;
}

.tab-content {
  min-height: 400px;
}

/* === LEAD HUNTER === */
.lead-hunter-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.tab-section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

/* Settings panel */
.settings-panel {
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  overflow: hidden;
}

.settings-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.settings-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: var(--text-muted);
  cursor: pointer;
}

.settings-input {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: var(--text-main);
  font-size: 0.875rem;
  width: 100%;
}

/* Niche grid */
.niche-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.niche-tile {
  padding: 0.6rem 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.15s ease;
  text-align: center;
}

.niche-tile:hover { border-color: rgba(147,51,234,0.5); color: var(--text-main); }
.niche-tile--active {
  background: rgba(147,51,234,0.2);
  border-color: var(--primary-color);
  color: var(--primary-color);
  font-weight: 600;
}

/* Controls row */
.hunter-controls {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.hunter-input, .hunter-select {
  flex: 1;
  min-width: 120px;
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: var(--text-main);
  font-size: 0.875rem;
}

.hunter-input:focus, .hunter-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* Stats strip */
.stats-strip {
  display: flex;
  gap: 1.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
  padding: 0.65rem 1rem;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.05);
}

/* AI lead cards */
.ai-leads-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ai-lead-card {
  padding: 1.1rem 1.25rem;
}

.ai-lead-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.ai-lead-name {
  font-weight: 700;
  font-size: 1rem;
}

.ai-lead-role {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
}

.temp-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 20px;
  white-space: nowrap;
}

.ai-lead-body {
  margin-bottom: 0.85rem;
}

.ai-lead-pain {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 0.3rem;
}

.ai-lead-signal {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem;
}

.ai-lead-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.ai-lead-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.ai-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: var(--text-muted);
  transition: all 0.15s ease;
}

.ai-action-btn:hover { border-color: rgba(255,255,255,0.2); color: var(--text-main); }

.ai-action-use {
  margin-left: auto;
  border-color: rgba(147,51,234,0.4);
  color: var(--primary-color);
  background: rgba(147,51,234,0.1);
}

.ai-action-use:hover {
  background: rgba(147,51,234,0.2);
  border-color: var(--primary-color);
}

/* === OUTREACH EMAIL + SCRIPT SHARED === */
.selected-lead-banner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  border-left: 3px solid var(--primary-color);
  background: rgba(147,51,234,0.08);
  border-radius: 0 8px 8px 0;
  margin-bottom: 1.5rem;
}

.selected-lead-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.selected-lead-pain {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: underline;
  white-space: nowrap;
  padding: 0;
}

/* Tone selector */
.tone-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.tone-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s ease;
}

.tone-btn--active {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(147,51,234,0.1);
}

/* Email output */
.email-output {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.email-subject {
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: var(--text-main);
  font-size: 0.9rem;
  font-weight: 500;
}

.email-body {
  padding: 0.9rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: var(--text-main);
  font-size: 0.875rem;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
}

.output-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

/* Script sections */
.script-sections {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.script-section {
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
  overflow: hidden;
}

.script-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255,255,255,0.04);
  border: none;
  color: var(--text-main);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: left;
  transition: background 0.15s ease;
}

.script-section-header:hover { background: rgba(255,255,255,0.07); }

.script-section-body {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.6;
  overflow: hidden;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
}

/* Small utility buttons */
.btn-sm { padding: 0.4rem 0.75rem; font-size: 0.8rem; }
.btn-ghost {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-muted);
}
.btn-ghost:hover { border-color: rgba(255,255,255,0.2); color: var(--text-main); }

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
}

.icon-btn:hover { color: var(--text-main); background: rgba(255,255,255,0.08); }

@media (max-width: 600px) {
  .niche-grid { grid-template-columns: repeat(3, 1fr); }
  .hunter-controls { flex-direction: column; }
  .tab-btn { font-size: 0.75rem; padding: 0.5rem 0.4rem; }
  .stats-strip { flex-direction: column; gap: 0.25rem; }
  .ai-lead-actions { gap: 0.3rem; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Generator.jsx src/pages/Generator.css
git commit -m "feat: rewrite Generator.jsx as 3-tab shell with Framer Motion transitions"
```

---

## Task 13: Add Lead Stream Add-On to Pricing.jsx

**Files:**
- Modify: `src/pages/Pricing.jsx`

- [ ] **Step 1: Read current Pricing.jsx to find the add-ons section**

```bash
grep -n "add.on\|addon\|Add-on\|addOn" src/pages/Pricing.jsx | head -20
```

- [ ] **Step 2: Add Lead Stream card**

Find the add-ons array/section in Pricing.jsx and add this new item. The exact insertion point depends on current structure — look for where existing add-ons are defined and add:

```jsx
{
  title: 'Lead Stream',
  price: 'R299',
  period: '/month',
  description: '5 qualified leads delivered to your WhatsApp every Monday. No dashboard to check. Just leads.',
  icon: '🎯',
  features: [
    '5 AI-qualified leads weekly',
    'Delivered to WhatsApp, Discord, or Telegram',
    'Niche + location targeting',
    'Lead score, pain point & budget included',
    'No login required',
  ],
  badge: 'New',
  cta: 'Get Lead Stream',
  href: '/contact',
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Pricing.jsx
git commit -m "feat: add Lead Stream add-on card to Pricing page (R299/month)"
```

---

## Task 14: Fix package.json Homepage

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update homepage field in package.json**

In `package.json`, find the `"homepage"` field and ensure it reads:
```json
"homepage": "https://driftstudio.co.za"
```

If there is no homepage field, add it after `"name"`.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "fix: set package.json homepage to driftstudio.co.za"
```

---

## Task 15: Seed Lead Stream — Ahmed as Client #1

**Files:**
- Create: `scripts/seedLeadStream.js`

- [ ] **Step 1: Create scripts/seedLeadStream.js**

```js
/**
 * One-time script: seed Ahmed Vally as Lead Stream Client #1.
 * Run with: node scripts/seedLeadStream.js
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var or Firebase project auth
 */

const admin = require('firebase-admin');

admin.initializeApp({
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
    whatsapp: '+27XXXXXXXXXX', // <-- replace with Ahmed's WhatsApp number
    discordWebhook: null,     // <-- optional: set to webhook URL
    telegramChatId: null,     // <-- optional: set to Telegram chat ID
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastRunAt: null,
  };

  const ref = await db.collection('leadStreamSubscriptions').add(doc);
  console.log(`Created Lead Stream subscription: ${ref.id}`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Fill in Ahmed's real values and run**

Edit the file to set:
- `whatsapp` — Ahmed's WhatsApp number in E.164 format (e.g. `+27821234567`)
- `discordWebhook` — paste webhook URL if you want Discord delivery too
- `telegramChatId` — paste your Telegram chat ID if you want Telegram delivery

Run:
```bash
node scripts/seedLeadStream.js
```

Expected output: `Created Lead Stream subscription: <doc_id>`

- [ ] **Step 3: Verify in Firebase Console**

Go to Firestore → `leadStreamSubscriptions` collection → confirm the document exists with `active: true`.

- [ ] **Step 4: Commit**

```bash
git add scripts/seedLeadStream.js
git commit -m "feat: add seedLeadStream script for Ahmed as Client #1"
```

---

## Task 16: Build and Deploy

**Files:**
- No file changes — build + deploy steps

- [ ] **Step 1: Install jsPDF if not already installed**

```bash
npm list jspdf || npm install jspdf
```

- [ ] **Step 2: Build the frontend**

```bash
npm run build
```

Expected: `dist/` folder created with no errors.

- [ ] **Step 3: Deploy to Firebase Hosting**

```bash
firebase deploy --only hosting
```

- [ ] **Step 4: Smoke test**

Visit `https://driftstudio.co.za/generate` and verify:
1. Three tabs render: Lead Hunter / Outreach Email / Sales Script
2. Select a niche, click "Generate 5 Leads" — spinner appears, leads render with score rings and temperature badges
3. Click "Use lead →" on a card — switches to Email tab with the lead pre-filled
4. Click "Generate Email" — email output appears with subject + body
5. Click "Copy" — clipboard contains the email
6. Switch to Script tab, click "Generate Script" — 7 collapsible sections appear
7. Click section headers — they expand/collapse with animation
8. Visit `https://driftstudio.co.za/pricing` — Lead Stream add-on card visible at R299/month

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: deploy Lead Intelligence Platform — 3-tab Generator + Lead Stream"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| 3-tab Generator (Hunter / Email / Script) | Task 12 |
| Niche 3×3 grid, purple active highlight | Task 9 |
| Location input, size dropdown, Generate button | Task 9 |
| Stats strip (session-scoped) | Task 9 |
| Lead cards with score ring, temp badge | Tasks 7, 8 |
| Staggered Framer Motion fade-up | Task 8 (delay: index * 0.1) |
| Discord/Telegram/WhatsApp card actions | Task 8 |
| PDF export (jsPDF, Drift Studio header) | Task 6 |
| "Use lead →" sets selectedLead, switches tab | Tasks 9, 12 |
| Auto-notify after batch generation | Task 9 (handleGenerate) |
| Settings panel (gear icon, localStorage) | Task 9 |
| Email tab: selected lead banner, tone selector | Task 10 |
| Email tab: Gemini prompt rules enforced | Handled by existing generateOutreachEmail |
| Email tab: Copy/Regenerate/Discord/WhatsApp/iMessage | Task 10 |
| Script tab: 7 collapsible sections | Task 11 |
| Script tab: all sections expanded by default | Task 11 (useState(true)) |
| Script tab: Gemini prompt rules (contractions, PAUSE/LISTEN) | Task 2 prompt |
| Script tab: Copy/Regenerate/Discord/WhatsApp | Task 11 |
| generateAILeads Cloud Function | Task 1 |
| generateOutreachScript Cloud Function | Task 2 |
| sendLeadAlert Cloud Function (no auth) | Task 3 |
| processLeadStreams scheduled (Mon 8am SAST) | Task 4 |
| AI leads saved to Firestore (source: ai_hunter) | Task 1 |
| leadStreamSubscriptions schema | Task 15 |
| Secrets never exposed to client | Tasks 3, 4 |
| Lead Stream message format | Task 4 |
| Ahmed = Client #1, seed subscription | Task 15 |
| Pricing page Lead Stream add-on (R299/month) | Task 13 |
| package.json homepage fix | Task 14 |
| Meta tags (og:url, twitter:url) | Already correct per index.html read — no change needed |

### Placeholder Scan

No TBDs. All code blocks contain complete, runnable code. Twilio WhatsApp number in seed script marked with comment to be replaced by user before running.

### Type Consistency

- `sendLeadAlert` called consistently with `{ type, lead?, leads?, channels, niche?, location?, whatsappTo? }` across Tasks 3, 6, 8, 9, 10, 11.
- `generateAILeads` returns `leads[]` (array), consistent with Task 9 usage.
- `generateOutreachEmail` returns `emailContent` (string), parsed in Task 10.
- `generateOutreachScript` returns `script` (object with 7 keys), used in Task 11.
- `exportLeadsToPDF` accepts `(leads, { niche, location })`, called correctly in Task 9.
