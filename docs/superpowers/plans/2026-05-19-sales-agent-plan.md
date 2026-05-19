# Sales Follow-Up Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an autonomous AI sales agent that sends a personalized 3-email Resend cadence when a lead is created, follows up on Day 3 and Day 7 if no reply, detects bounces/complaints via Resend webhook, and posts Discord alerts when leads reply or are marked qualified.

**Architecture:** Three Cloud Functions handle the full lifecycle: `salesAgentTrigger` (Firestore `onDocumentCreated` on `leads/{leadId}`) sends Day 1 immediately; `salesAgentFollowUp` (daily cron 9am SAST) queries for leads due Day 3/7 and sends the next email; `salesAgentReplyWebhook` (HTTP POST) handles Resend delivery events and manual reply/qualify signals from the admin UI, posting Discord alerts. A `salesAgentService.js` handles Firestore writes and webhook calls from the frontend. The existing Leads page gets a "Sales Outreach" section below the lead list with per-lead status badges and action buttons.

**Tech Stack:** Firebase Cloud Functions v2 (`onDocumentCreated`, `onSchedule`, `onRequest`), Resend SDK v6 (already in `functions/package.json`), Gemini 2.0 Flash via existing `getAI()` helper, `axios` for Discord alerts (already imported), Firebase Admin SDK for Firestore writes.

**Pre-confirmed:** `DISCORD_WEBHOOK_URL` secret is already set. Resend domain `driftstudio.co.za` is active. `resend` npm package is already in `functions/package.json`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `functions/index.js` | Modify | Add `onDocumentCreated` import, `getResend`, `postDiscordAlert`, `buildOutreachEmail` helpers, `salesAgentTrigger`, `salesAgentFollowUp`, `salesAgentReplyWebhook` |
| `src/services/salesAgentService.js` | Create | Firestore writes + webhook calls for admin UI (markReplied, markQualified, stopOutreach) |
| `src/pages/Leads.jsx` | Modify | Add outreach status badges + Mark Replied / Mark Qualified / Stop Outreach buttons |
| `.env.example` | Modify | Add `VITE_SALES_AGENT_WEBHOOK_URL` |

---

### Task 1: Add helpers + salesAgentTrigger (Day 1 email on lead creation)

**Files:**
- Modify: `functions/index.js`

- [ ] **Step 1: Add `onDocumentCreated` import and Resend require**

Open `functions/index.js`. The first two imports are:
```js
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
```

Add a third import line immediately after line 18 (`const { onSchedule } = ...`):
```js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
```

Then find the line `const axios = require("axios");` and add after it:
```js
const { Resend } = require("resend");
```

- [ ] **Step 2: Add Sales Agent helpers block**

Find the line `// ==================== CONTENT STUDIO HELPERS ====================` (around line 76). Insert the following block **immediately before** that line:

```js
// ==================== SALES AGENT HELPERS ====================

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  return new Resend(apiKey);
};

const postDiscordAlert = async (message) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await axios.post(webhookUrl, { content: message });
  } catch (e) {
    logger.error("Discord alert failed:", e.message);
  }
};

const HUMANIZER_RULES = `HUMANIZER RULES — apply every one:
- No em dashes (—)
- Never open with "I hope this finds you well" or any filler opener
- No rule-of-three bullet lists
- No sentence starting with an -ing verb
- Mix sentence lengths: short punchy lines alongside longer flowing ones
- Use contractions throughout (I'm, we've, don't, it's, you're)
- No corporate buzzwords: leverage, synergy, robust, seamlessly, holistic, ecosystem
- Single specific CTA only — never multiple asks
- Reference the business name and industry in the first sentence`;

const buildOutreachEmail = async (lead, step) => {
  const { business_name, industry, notes } = lead;
  const ai = getAI();
  let prompt;

  if (step === 1) {
    prompt = `You are Ahmed from Drift Studio, a South African marketing agency. Write a Day 1 cold outreach email to ${business_name}, a business in the ${industry || "general"} industry.

Goal: Open a conversation. No pitch, no pricing.
Instructions:
- Max 150 words
- Reference "${business_name}" and "${industry || "your industry"}" in the first sentence
- Mention one specific challenge businesses in the ${industry || "general"} industry face
- Ask one open question that invites a reply
- Sign off as "Ahmed, Drift Studio"
${HUMANIZER_RULES}
${notes ? `Context about this lead: ${notes}` : ""}

Respond with a JSON object: { "subject": "...", "body": "..." }
Output ONLY raw JSON. No markdown, no explanation.`;
  } else if (step === 2) {
    prompt = `You are Ahmed from Drift Studio, a South African marketing agency. Write a Day 3 follow-up email to ${business_name}, a business in the ${industry || "general"} industry. They didn't reply to your first email.

Goal: A fresh hook. Different value angle.
Instructions:
- Max 120 words
- Reference the Day 1 email briefly ("I reached out earlier this week")
- Lead with a stat, trend, or insight relevant to the ${industry || "general"} industry in South Africa
- One question at the end
- Do not mention pricing or services directly
- Sign off as "Ahmed, Drift Studio"
${HUMANIZER_RULES}
${notes ? `Context about this lead: ${notes}` : ""}

Respond with a JSON object: { "subject": "...", "body": "..." }
Output ONLY raw JSON. No markdown, no explanation.`;
  } else {
    prompt = `You are Ahmed from Drift Studio, a South African marketing agency. Write a Day 7 final follow-up email to ${business_name}, a business in the ${industry || "general"} industry. They haven't replied to two previous emails.

Goal: Last attempt. Give something before leaving.
Instructions:
- Max 160 words
- Acknowledge this is the last follow-up
- Include one specific, actionable marketing tip for a ${industry || "general"} business in South Africa
- End with: "If the timing's not right, no worries — I'll leave it here. Feel free to reach out whenever."
- No hard sell
- Sign off as "Ahmed, Drift Studio"
${HUMANIZER_RULES}
${notes ? `Context about this lead: ${notes}` : ""}

Respond with a JSON object: { "subject": "...", "body": "..." }
Output ONLY raw JSON. No markdown, no explanation.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const raw = (response.text ?? "").trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  return parseJsonResponse(raw, `buildOutreachEmail step ${step}`);
};

```

- [ ] **Step 3: Add `salesAgentTrigger` Cloud Function**

Find the line `// ==================== CONTENT STUDIO ====================` (the section that starts the `contentGeneratorProxy` export). Add the following block **after** the closing `);` of the `contentGeneratorProxy` export (after line ~178):

```js
// ==================== SALES AGENT ====================

exports.salesAgentTrigger = onDocumentCreated(
  {
    document: "leads/{leadId}",
    secrets: ["RESEND_API_KEY", "GEMINI_API_KEY", "DISCORD_WEBHOOK_URL"],
    timeoutSeconds: 60,
  },
  async (event) => {
    const lead = event.data.data();
    const leadId = event.params.leadId;

    if (!lead.email) {
      logger.warn(`salesAgentTrigger: lead ${leadId} has no email, skipping`);
      return;
    }

    // Skip if salesAgent map was already initialized (re-created doc edge case)
    if (lead.salesAgent?.sequenceStep) return;

    try {
      const { subject, body } = await buildOutreachEmail(lead, 1);

      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: "Drift Studio <hello@driftstudio.co.za>",
        to: lead.email,
        subject,
        text: body,
        replyTo: "hello@driftstudio.co.za",
      });

      if (error) {
        logger.error(`salesAgentTrigger Resend error for ${leadId}:`, error);
        return;
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      await db.collection("leads").doc(leadId).update({
        salesAgent: {
          status: "contacted",
          sequenceStep: 1,
          lastEmailedAt: now,
          firstContactedAt: now,
          qualifiedAt: null,
          replyDetectedAt: null,
          emailIds: [data.id],
          conversationSummary: `Day 1 intro sent. Subject: "${subject}"`,
          stopRequested: false,
        },
      });

      logger.info(`salesAgentTrigger: Day 1 email sent to ${lead.email} for lead ${leadId}`);
    } catch (err) {
      logger.error(`salesAgentTrigger error for ${leadId}:`, err);
    }
  }
);
```

- [ ] **Step 4: Verify syntax**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media/functions"
node -e "require('./index.js')" 2>&1 | head -20
```

Expected: No syntax errors printed. Some "not set" warnings from missing env vars at require-time are acceptable — the function still loads.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js
git commit -m "feat: add salesAgentTrigger — Day 1 Resend outreach on lead creation"
```

---

### Task 2: salesAgentFollowUp (Day 3 + Day 7 daily cron)

**Files:**
- Modify: `functions/index.js` (append after `salesAgentTrigger`)

- [ ] **Step 1: Add `salesAgentFollowUp` Cloud Function**

Append to `functions/index.js` immediately after the closing `);` of the `salesAgentTrigger` export:

```js
exports.salesAgentFollowUp = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Africa/Johannesburg",
    secrets: ["RESEND_API_KEY", "GEMINI_API_KEY", "DISCORD_WEBHOOK_URL"],
    timeoutSeconds: 300,
  },
  async () => {
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const fourDaysMs = 4 * 24 * 60 * 60 * 1000; // Day 7 = Day 3 + 4 more days
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

    const TERMINAL_STATUSES = ["replied", "qualified", "bounced", "not_interested"];

    // --- Day 3 candidates: sequenceStep === 1, lastEmailedAt >= 3 days ago ---
    const step1Snap = await db.collection("leads")
      .where("salesAgent.sequenceStep", "==", 1)
      .get();

    const day3Candidates = step1Snap.docs.filter((doc) => {
      const sa = doc.data().salesAgent;
      if (!sa || sa.stopRequested || TERMINAL_STATUSES.includes(sa.status)) return false;
      const lastEmailedMs = sa.lastEmailedAt?.toMillis?.() || 0;
      return now - lastEmailedMs >= threeDaysMs;
    });

    // --- Day 7 candidates: sequenceStep === 2, lastEmailedAt >= 4 days ago ---
    const step2Snap = await db.collection("leads")
      .where("salesAgent.sequenceStep", "==", 2)
      .get();

    const day7Candidates = step2Snap.docs.filter((doc) => {
      const sa = doc.data().salesAgent;
      if (!sa || sa.stopRequested || TERMINAL_STATUSES.includes(sa.status)) return false;
      const lastEmailedMs = sa.lastEmailedAt?.toMillis?.() || 0;
      return now - lastEmailedMs >= fourDaysMs;
    });

    logger.info(`salesAgentFollowUp: ${day3Candidates.length} Day-3, ${day7Candidates.length} Day-7 candidates`);

    const resend = getResend();

    for (const doc of day3Candidates) {
      const lead = doc.data();
      const leadId = doc.id;
      if (!lead.email) continue;
      try {
        const { subject, body } = await buildOutreachEmail(lead, 2);
        const { data, error } = await resend.emails.send({
          from: "Drift Studio <hello@driftstudio.co.za>",
          to: lead.email,
          subject,
          text: body,
          replyTo: "hello@driftstudio.co.za",
        });
        if (error) { logger.error(`Day 3 Resend error for ${leadId}:`, error); continue; }

        await db.collection("leads").doc(leadId).update({
          "salesAgent.status": "followed_up_1",
          "salesAgent.sequenceStep": 2,
          "salesAgent.lastEmailedAt": admin.firestore.FieldValue.serverTimestamp(),
          "salesAgent.emailIds": admin.firestore.FieldValue.arrayUnion(data.id),
          "salesAgent.conversationSummary": `Day 1 intro + Day 3 follow-up sent. Last subject: "${subject}"`,
        });
        logger.info(`salesAgentFollowUp: Day 3 sent to ${lead.email}`);
      } catch (err) {
        logger.error(`salesAgentFollowUp Day 3 error for ${leadId}:`, err);
      }
    }

    for (const doc of day7Candidates) {
      const lead = doc.data();
      const leadId = doc.id;
      if (!lead.email) continue;
      try {
        const { subject, body } = await buildOutreachEmail(lead, 3);
        const { data, error } = await resend.emails.send({
          from: "Drift Studio <hello@driftstudio.co.za>",
          to: lead.email,
          subject,
          text: body,
          replyTo: "hello@driftstudio.co.za",
        });
        if (error) { logger.error(`Day 7 Resend error for ${leadId}:`, error); continue; }

        await db.collection("leads").doc(leadId).update({
          "salesAgent.status": "followed_up_2",
          "salesAgent.sequenceStep": 3,
          "salesAgent.lastEmailedAt": admin.firestore.FieldValue.serverTimestamp(),
          "salesAgent.emailIds": admin.firestore.FieldValue.arrayUnion(data.id),
          "salesAgent.conversationSummary": `Full 3-email sequence complete. No reply. Last subject: "${subject}"`,
        });
        logger.info(`salesAgentFollowUp: Day 7 sent to ${lead.email}`);
      } catch (err) {
        logger.error(`salesAgentFollowUp Day 7 error for ${leadId}:`, err);
      }
    }

    // --- Mark no_response for step 3 leads where Day 7 was sent 2+ days ago ---
    const step3Snap = await db.collection("leads")
      .where("salesAgent.sequenceStep", "==", 3)
      .where("salesAgent.status", "==", "followed_up_2")
      .get();

    for (const doc of step3Snap.docs) {
      const sa = doc.data().salesAgent;
      if (sa.stopRequested) continue;
      const lastEmailedMs = sa.lastEmailedAt?.toMillis?.() || 0;
      if (now - lastEmailedMs >= twoDaysMs) {
        await db.collection("leads").doc(doc.id).update({
          "salesAgent.status": "no_response",
        });
        logger.info(`salesAgentFollowUp: marked no_response for ${doc.id}`);
      }
    }
  }
);
```

- [ ] **Step 2: Verify syntax**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media/functions"
node -e "require('./index.js')" 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add functions/index.js
git commit -m "feat: add salesAgentFollowUp — Day 3/7 scheduled email cadence"
```

---

### Task 3: salesAgentReplyWebhook (Resend delivery events + manual triggers)

**Files:**
- Modify: `functions/index.js` (append after `salesAgentFollowUp`)

- [ ] **Step 1: Add `salesAgentReplyWebhook` Cloud Function**

Append to `functions/index.js` immediately after the closing `);` of the `salesAgentFollowUp` export:

```js
exports.salesAgentReplyWebhook = onRequest(
  {
    secrets: ["DISCORD_WEBHOOK_URL", "RESEND_WEBHOOK_SECRET"],
    cors: true,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

      const payload = req.body;
      const type = payload.type;
      const leadId = payload.leadId; // present for manual triggers from the admin UI

      // Validate Resend webhook signature for server-originated events (not manual browser calls)
      const signingSecret = process.env.RESEND_WEBHOOK_SECRET;
      const hasSvixHeaders =
        req.headers["svix-id"] && req.headers["svix-timestamp"] && req.headers["svix-signature"];

      if (!leadId && signingSecret && hasSvixHeaders) {
        const crypto = require("crypto");
        const msgId = req.headers["svix-id"];
        const timestamp = req.headers["svix-timestamp"];
        const signature = req.headers["svix-signature"];
        const rawBody = JSON.stringify(req.body);
        const toSign = `${msgId}.${timestamp}.${rawBody}`;
        const expected = crypto
          .createHmac("sha256", signingSecret)
          .update(toSign)
          .digest("base64");
        const signatures = signature.split(" ").map((s) => s.replace(/^v1,/, ""));
        const valid = signatures.some((sig) => {
          try {
            return crypto.timingSafeEqual(
              Buffer.from(sig, "base64"),
              Buffer.from(expected, "base64")
            );
          } catch { return false; }
        });
        if (!valid) return res.status(401).json({ error: "Invalid webhook signature" });
      }

      // ─── Manual trigger: mark replied ───────────────────────────────────────
      if (leadId && type === "replied") {
        try {
          const leadRef = db.collection("leads").doc(leadId);
          const leadSnap = await leadRef.get();
          if (!leadSnap.exists) return res.status(404).json({ error: "Lead not found" });

          const lead = leadSnap.data();
          await leadRef.update({
            "salesAgent.status": "replied",
            "salesAgent.replyDetectedAt": admin.firestore.FieldValue.serverTimestamp(),
          });

          const sa = lead.salesAgent || {};
          const city = lead.location || lead.city || "SA";
          const daysAgo = sa.firstContactedAt
            ? Math.floor((Date.now() - sa.firstContactedAt.toMillis()) / (1000 * 60 * 60 * 24))
            : "?";
          const stepLabel =
            sa.sequenceStep === 1 ? "Day 1 intro" :
            sa.sequenceStep === 2 ? "Day 3 follow-up" : "Day 7 final";

          await postDiscordAlert(
            `💬 **LEAD REPLIED — Check your inbox**\n` +
            `Name: ${lead.business_name}\n` +
            `Email: ${lead.email}\n` +
            `Industry: ${lead.industry || "Unknown"} | ${city}\n` +
            `Contacted: ${daysAgo} day(s) ago (${stepLabel})\n\n` +
            `Reply to ${lead.email} to continue the conversation.`
          );

          return res.status(200).json({ success: true });
        } catch (err) {
          logger.error("salesAgentReplyWebhook replied error:", err);
          return res.status(500).json({ error: "Internal error" });
        }
      }

      // ─── Manual trigger: mark qualified ─────────────────────────────────────
      if (leadId && type === "qualified") {
        try {
          const leadRef = db.collection("leads").doc(leadId);
          const leadSnap = await leadRef.get();
          if (!leadSnap.exists) return res.status(404).json({ error: "Lead not found" });

          const lead = leadSnap.data();
          await leadRef.update({
            "salesAgent.status": "qualified",
            "salesAgent.qualifiedAt": admin.firestore.FieldValue.serverTimestamp(),
          });

          await postDiscordAlert(
            `🔥 **QUALIFIED LEAD**\n` +
            `Name: ${lead.business_name} | ${lead.email}\n` +
            `Industry: ${lead.industry || "Unknown"} | ${lead.location || "SA"}\n` +
            `Notes: ${lead.notes || "None"}\n\n` +
            `They're interested. Book the call.`
          );

          return res.status(200).json({ success: true });
        } catch (err) {
          logger.error("salesAgentReplyWebhook qualified error:", err);
          return res.status(500).json({ error: "Internal error" });
        }
      }

      // ─── Resend: email bounced ───────────────────────────────────────────────
      if (type === "email.bounced") {
        const emailId = payload.data?.email_id;
        try {
          const snap = await db.collection("leads")
            .where("salesAgent.emailIds", "array-contains", emailId)
            .get();
          if (!snap.empty) {
            const doc = snap.docs[0];
            const lead = doc.data();
            await doc.ref.update({
              "salesAgent.status": "bounced",
              "salesAgent.stopRequested": true,
            });
            await postDiscordAlert(
              `⚠️ **Bounce:** ${lead.business_name} — ${lead.email}`
            );
          }
        } catch (err) {
          logger.error("salesAgentReplyWebhook bounce error:", err);
        }
        return res.status(200).json({ received: true });
      }

      // ─── Resend: spam complaint ──────────────────────────────────────────────
      if (type === "email.complained") {
        const emailId = payload.data?.email_id;
        try {
          const snap = await db.collection("leads")
            .where("salesAgent.emailIds", "array-contains", emailId)
            .get();
          if (!snap.empty) {
            const doc = snap.docs[0];
            const lead = doc.data();
            await doc.ref.update({
              "salesAgent.status": "not_interested",
              "salesAgent.stopRequested": true,
            });
            await postDiscordAlert(
              `🚫 **Spam complaint:** ${lead.business_name} — ${lead.email}`
            );
          }
        } catch (err) {
          logger.error("salesAgentReplyWebhook complaint error:", err);
        }
        return res.status(200).json({ received: true });
      }

      // Unknown event — acknowledge to prevent Resend retries
      return res.status(200).json({ received: true });
    });
  }
);
```

- [ ] **Step 2: Verify syntax**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media/functions"
node -e "require('./index.js')" 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add functions/index.js
git commit -m "feat: add salesAgentReplyWebhook — Resend events + manual reply/qualify triggers"
```

---

### Task 4: salesAgentService.js (frontend service)

**Files:**
- Create: `src/services/salesAgentService.js`
- Modify: `.env.example`

- [ ] **Step 1: Create the service file**

Create `/Volumes/Ahmed's Drive /Antigravity/freeflow-media/src/services/salesAgentService.js` with this exact content:

```js
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
```

- [ ] **Step 2: Add `VITE_SALES_AGENT_WEBHOOK_URL` to `.env.example`**

Append to the end of `/Volumes/Ahmed's Drive /Antigravity/freeflow-media/.env.example`:

```
# ==========================================
# SALES AGENT
# ==========================================
VITE_SALES_AGENT_WEBHOOK_URL=https://us-central1-freeflow-media.cloudfunctions.net/salesAgentReplyWebhook
```

- [ ] **Step 3: Commit**

```bash
git add src/services/salesAgentService.js .env.example
git commit -m "feat: add salesAgentService — markReplied, markQualified, stopOutreach"
```

---

### Task 5: Leads.jsx — outreach status + action buttons

**Files:**
- Modify: `src/pages/Leads.jsx`

- [ ] **Step 1: Add imports**

Open `src/pages/Leads.jsx`. At the top, the existing lucide-react import is on line 2:
```jsx
import {
  Plus, Sparkles, Download, LayoutGrid, Columns, Trash2,
  UserCheck, RefreshCw, TrendingUp, Users, Target, Star,
  ChevronDown
} from 'lucide-react';
```

Replace it with (adds `Mail`, `BellRing`, `Ban`):
```jsx
import {
  Plus, Sparkles, Download, LayoutGrid, Columns, Trash2,
  UserCheck, RefreshCw, TrendingUp, Users, Target, Star,
  ChevronDown, Mail, BellRing, Ban
} from 'lucide-react';
```

Then add this import after the existing `leadApi` import (after line 17):
```jsx
import {
  markLeadReplied, markLeadQualified, stopOutreach,
  SALES_AGENT_STATUS_LABELS, SALES_AGENT_STATUS_COLORS,
} from '../services/salesAgentService';
```

- [ ] **Step 2: Add salesAgent action handlers**

Inside the `Leads` function, after the `handleGenerated` handler (after line 148), add:

```jsx
const handleMarkReplied = async (leadId) => {
  try {
    await markLeadReplied(leadId);
    toast.success('Lead marked as replied — Discord alert sent');
    loadData();
  } catch { toast.error('Failed to mark as replied'); }
};

const handleMarkQualified = async (leadId) => {
  try {
    await markLeadQualified(leadId);
    toast.success('Lead marked as qualified — Discord alert sent');
    loadData();
  } catch { toast.error('Failed to mark as qualified'); }
};

const handleStopOutreach = async (leadId) => {
  if (!window.confirm('Stop all outreach to this lead? This cannot be undone.')) return;
  try {
    await stopOutreach(leadId);
    toast.success('Outreach stopped');
    loadData();
  } catch { toast.error('Failed to stop outreach'); }
};
```

- [ ] **Step 3: Add `OutreachStatusBadge` component**

Inside the `Leads` function, after the `StatCard` component (after line 170), add:

```jsx
const OutreachStatusBadge = ({ status }) => {
  if (!status) return null;
  const color = SALES_AGENT_STATUS_COLORS[status] || '#6B7280';
  const label = SALES_AGENT_STATUS_LABELS[status] || status;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.6rem', borderRadius: 99,
      background: `${color}20`, border: `1px solid ${color}40`,
      color, fontSize: '0.7rem', fontWeight: 600,
    }}>
      <Mail size={10} />
      {label}
    </span>
  );
};
```

- [ ] **Step 4: Add the "Sales Outreach" section to the JSX**

In the `return` statement of `Leads`, find the closing `</div>` of the main content section — the one just before the Modals section. It looks like this (around line 370):

```jsx
        )}

      </div>

      {/* Modals */}
```

Insert the following block between that closing `</div>` and the `{/* Modals */}` comment:

```jsx
        {/* Sales Outreach */}
        {displayed.some(l => l.salesAgent?.status) && (
          <div style={{ marginTop: '3rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                Sales <span className="gradient-text">Outreach</span>
              </h2>
              <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Automated follow-up — leads the sales agent has contacted
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {displayed.filter(l => l.salesAgent?.status).map(lead => {
                const sa = lead.salesAgent;
                const TERMINAL = ['replied', 'qualified', 'not_interested', 'bounced'];
                const canReply = !TERMINAL.includes(sa.status) && !sa.stopRequested;
                const canQualify = sa.status === 'replied';
                const canStop = !sa.stopRequested && !TERMINAL.includes(sa.status) && sa.status !== 'no_response';
                return (
                  <div
                    key={lead.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                      padding: '0.85rem 1.1rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{lead.business_name}</p>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.email}</p>
                    </div>
                    <OutreachStatusBadge status={sa.status} />
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                      {canReply && (
                        <button
                          onClick={() => handleMarkReplied(lead.id)}
                          style={{
                            padding: '0.35rem 0.75rem', borderRadius: 8,
                            border: '1px solid rgba(245,158,11,0.4)',
                            background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                          }}
                        >
                          <BellRing size={11} /> Mark Replied
                        </button>
                      )}
                      {canQualify && (
                        <button
                          onClick={() => handleMarkQualified(lead.id)}
                          style={{
                            padding: '0.35rem 0.75rem', borderRadius: 8,
                            border: '1px solid rgba(34,197,94,0.4)',
                            background: 'rgba(34,197,94,0.1)', color: '#22C55E',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                          }}
                        >
                          ✓ Qualified
                        </button>
                      )}
                      {canStop && (
                        <button
                          onClick={() => handleStopOutreach(lead.id)}
                          style={{
                            padding: '0.35rem 0.75rem', borderRadius: 8,
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'transparent', color: '#EF4444',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                          }}
                        >
                          <Ban size={11} /> Stop
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
```

- [ ] **Step 5: Build to verify no errors**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media"
npm run build 2>&1 | tail -20
```

Expected: Build succeeded, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Leads.jsx
git commit -m "feat: add salesAgent status + outreach action buttons to Leads page"
```

---

### Task 6: Deploy

**Files:** None (deployment + environment config only)

- [ ] **Step 1: Set `RESEND_API_KEY` Firebase secret**

```bash
firebase functions:secrets:set RESEND_API_KEY
```

Paste the Resend API key from resend.com → API Keys when prompted.

- [ ] **Step 2: Add `VITE_SALES_AGENT_WEBHOOK_URL` to `.env`**

Open `/Volumes/Ahmed's Drive /Antigravity/freeflow-media/.env` and add:
```
VITE_SALES_AGENT_WEBHOOK_URL=https://us-central1-freeflow-media.cloudfunctions.net/salesAgentReplyWebhook
```

- [ ] **Step 3: Deploy functions**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media"
firebase deploy --only functions
```

Expected: All functions deploy. Look for the `salesAgentReplyWebhook` URL in the output — it looks like:
```
Function URL (salesAgentReplyWebhook(us-central1)): https://us-central1-freeflow-media.cloudfunctions.net/salesAgentReplyWebhook
```

> **Note:** If Firestore complains about a missing composite index for `salesAgent.sequenceStep` + other fields, Firebase will print a direct link to create it. Click the link and create the index — it takes about 1 minute.

- [ ] **Step 4: Deploy hosting**

```bash
firebase deploy --only hosting
```

- [ ] **Step 5: Configure Resend webhook (one-time manual step)**

Go to resend.com → Webhooks → Add endpoint:
- URL: `https://us-central1-freeflow-media.cloudfunctions.net/salesAgentReplyWebhook`
- Events: `email.bounced`, `email.complained`
- Save → copy the **Signing Secret** shown

Set the signing secret as a Firebase secret:
```bash
firebase functions:secrets:set RESEND_WEBHOOK_SECRET
```

Then redeploy functions to pick up the new secret:
```bash
firebase deploy --only functions
```

- [ ] **Step 6: Smoke test**

Add a new lead via the Leads UI (use your own email for testing). Within 30 seconds, a Day 1 email should arrive from `hello@driftstudio.co.za`. Check the lead in Firestore — it should have a `salesAgent` map with `status: "contacted"` and `sequenceStep: 1`.

- [ ] **Step 7: Commit**

```bash
git add .env.example
git commit -m "deploy: sales follow-up agent live — Resend + Discord + Firestore pipeline"
```
