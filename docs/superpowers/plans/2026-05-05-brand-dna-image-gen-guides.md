# Brand DNA, Image Generation & Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three features to Drift Studio: a public Guides page, a Brand DNA learning system that builds a brand voice profile per client from approval and revision signals, and AI image generation per social post using Imagen 3.

**Architecture:** Guides is a standalone static React page. Brand DNA adds a `brandProfiles` Firestore collection and a `brandDnaService.js` that is called on every revision and approval, then injected into every content generation prompt. Image generation runs in the content pipeline immediately after calendar text generation, calling Imagen 3 via Vertex AI REST API, uploading to Firebase Storage, and attaching `imageUrl` to each post.

**Tech Stack:** React + Framer Motion + Lucide React (frontend), Firebase Functions v2 Node 20, Firestore, Firebase Storage, Vertex AI REST API (Imagen 3), Google Auth Library, Axios.

---

## Phase 1 — Guides & Help Centre

### Task 1: Create the public Guides page

**Files:**
- Create: `src/pages/Guides.jsx`

- [ ] **Step 1: Create `src/pages/Guides.jsx` with this full content**

```jsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FileText, Search, Settings2, LayoutDashboard, Zap, Link2, ChevronDown, ChevronUp, Key } from 'lucide-react';

const GUIDES = [
  {
    icon: FileText,
    color: '#9333EA',
    title: 'How to submit a content brief',
    description: 'Get your 30-day AI content calendar started in under 5 minutes.',
    steps: [
      'Navigate to Submit Brief from the home page or your client portal.',
      'Fill in your business name, industry, target audience, and campaign goal.',
      'Select which platforms you want content for: Instagram, Facebook, TikTok, LinkedIn, or X.',
      'Upload brand assets — logos, product photos — to help the AI match your visual style (optional).',
      'Click Submit. You\'ll get a confirmation email and your calendar review link within minutes.',
    ],
  },
  {
    icon: FileText,
    color: '#A855F7',
    title: 'How to review and approve your calendar',
    description: 'Review every post before anything goes live — one click approves the whole month.',
    steps: [
      'Open the review link emailed to you after brief submission.',
      'Browse each post: caption, AI-generated image, visual direction, hashtags, and scheduled time.',
      'If everything looks good, click "Approve All & Schedule" — all posts queue immediately.',
      'Your calendar is saved automatically to your Google Drive folder as a Google Doc.',
      'You\'ll receive a confirmation email once scheduling is complete.',
    ],
  },
  {
    icon: Settings2,
    color: '#C084FC',
    title: 'How to request revisions',
    description: 'Not quite right? Tell the AI what to change — in plain English.',
    steps: [
      'On the calendar review page, click "Request Changes".',
      'Type your feedback in plain English, e.g. "use a more professional tone and avoid emojis".',
      'Click Send Feedback. The AI re-generates your calendar using your feedback within minutes.',
      'You\'ll receive a new review link by email.',
      'You have up to 3 revision rounds per calendar. Each one makes the AI smarter about your brand.',
    ],
  },
  {
    icon: Search,
    color: '#9333EA',
    title: 'How to use the Price Intelligence tool',
    description: 'Get a full competitor pricing analysis for your industry in minutes.',
    steps: [
      'Navigate to Price Intelligence from the Tools menu.',
      'Enter your business type, your location, and up to 3 competitor names.',
      'Pay the once-off R149 fee via card or EFT.',
      'Receive a full report: competitor pricing tiers, market benchmarks, and your recommended price positioning.',
      'The report is emailed to you and available in your account.',
    ],
  },
  {
    icon: LayoutDashboard,
    color: '#A855F7',
    title: 'How to read your Client Portal dashboard',
    description: 'Your live campaign hub — see exactly what\'s queued, published, and coming next.',
    steps: [
      'Log in at /client-portal with your email and password.',
      'The Dashboard tab shows active campaigns, total posts queued, and total posts published.',
      'The Calendars tab shows all your content calendars with their current status (awaiting approval, approved, scheduled).',
      'The Upcoming Posts tab previews the next 5 posts with captions, platform badges, and scheduled times.',
      'Click any post card to expand the full caption, image, and hashtags.',
    ],
  },
  {
    icon: Zap,
    color: '#C084FC',
    title: 'How to use the Marketing Strategy Generator',
    description: 'Generate a full AI marketing strategy report for your business in one go.',
    steps: [
      'Navigate to Strategy Generator from the Tools menu or home page.',
      'Fill in your business details, target audience, and what marketing you\'re currently doing.',
      'Add any promotional specials or seasonal campaigns you want included.',
      'Pay the once-off R99 fee — or enter a promo code to skip payment.',
      'Your strategy report is generated in about 60 seconds and displayed on screen.',
    ],
  },
  {
    icon: Key,
    color: '#9333EA',
    title: 'How to connect your social media accounts',
    description: 'Give Drift Studio permission to publish to your accounts automatically.',
    steps: [
      'Instagram & Facebook: Go to Meta Business Suite (business.facebook.com) → Settings → System Users → Generate token → select your Page and Instagram account → copy the token → paste it in Drift Studio account settings.',
      'TikTok: Go to TikTok for Business (ads.tiktok.com) → Developer Portal → My Apps → Create App → copy the API key and secret → paste in Drift Studio account settings.',
      'LinkedIn: Go to LinkedIn Developer Portal (developer.linkedin.com) → My Apps → Create App → Products → Request "Share on LinkedIn" access → copy Client ID and Secret → paste in Drift Studio account settings.',
      'X (Twitter): Go to developer.x.com → Projects & Apps → your app → Keys and Tokens → copy the Bearer Token → paste in Drift Studio account settings.',
      'All credentials are encrypted at rest. Drift Studio never stores your personal login password.',
    ],
  },
];

const GuideCard = ({ guide, index }) => {
  const [open, setOpen] = useState(false);
  const Icon = guide.icon;

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${open ? guide.color : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '1.5rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          background: `${guide.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} color={guide.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{guide.title}</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{guide.description}</p>
        </div>
        {open
          ? <ChevronUp size={18} color={guide.color} style={{ flexShrink: 0 }} />
          : <ChevronDown size={18} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <ol style={{ margin: '1rem 0 0', padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {guide.steps.map((step, i) => (
                  <li key={i} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function Guides() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-container">
      <div className="container" style={{ paddingTop: '8rem', paddingBottom: '6rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h1 style={{ marginBottom: '1rem' }}>Help &amp; <span className="gradient-text">Guides</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto' }}>
            Step-by-step walkthroughs for every Drift Studio feature. Click any guide to expand it.
          </p>
        </div>

        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {GUIDES.map((guide, i) => (
            <GuideCard key={i} guide={guide} index={i} />
          ))}
        </div>

      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify the file saved correctly**

Run: `cat src/pages/Guides.jsx | head -5`
Expected: first line is `import { motion, AnimatePresence } from 'framer-motion';`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Guides.jsx
git commit -m "feat: add Guides page with 7 expandable step-by-step guides"
```

---

### Task 2: Wire up the /guides route and navbar

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Navbar.jsx`

- [ ] **Step 1: Add the lazy import and route to `src/App.jsx`**

After the existing lazy imports (around line 28), add:
```jsx
const Guides = lazy(() => import('./pages/Guides'));
```

Then inside the `<Routes>` block, add this route alongside the others:
```jsx
<Route path="/guides" element={<Suspense fallback={<PageLoader />}><Guides /></Suspense>} />
```

- [ ] **Step 2: Add Guides to the navbar in `src/components/Navbar.jsx`**

In the `<ul className={...nav-links...}>` block, add a new `<li>` between `<li><Link to="/work"...>Work</Link></li>` and `<li><Link to="/pricing"...>Pricing</Link></li>`:

```jsx
<li><Link to="/guides" onClick={closeMobile}>Guides</Link></li>
```

- [ ] **Step 3: Start the dev server and verify**

Run: `npm run dev`

Open `http://localhost:5173/guides` — you should see the Guides page with 7 expandable cards. Click each card to confirm the accordion opens and closes.

Check the navbar — "Guides" should appear between "Work" and "Pricing" on desktop, and in the mobile menu.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/Navbar.jsx
git commit -m "feat: add /guides route and navbar link"
```

---

### Task 3: Add contextual help panel to Client Portal

**Files:**
- Modify: `src/pages/ClientPortal.jsx`

- [ ] **Step 1: Add the HelpPanel component at the top of `src/pages/ClientPortal.jsx`**

Find the `PostCard` component definition (around line 42). Just before it, add:

```jsx
const PORTAL_HELP = {
  dashboard: {
    title: 'Reading your dashboard',
    steps: [
      'Active Campaigns shows calendars currently in the scheduled or approved state.',
      'Posts Queued is the number of posts waiting to publish across all your calendars.',
      'Posts Published is the running total of posts that have already gone live.',
      'All counts update in real time as posts publish.',
    ],
  },
  calendars: {
    title: 'Managing your calendars',
    steps: [
      'Awaiting Approval — your calendar is ready to review. Check your email for the review link.',
      'Approved — you\'ve approved it and posts are queuing up to publish.',
      'Scheduled — posts are actively being published on their scheduled dates.',
      'Revision Requested — feedback sent, the AI is regenerating your calendar.',
    ],
  },
  posts: {
    title: 'Upcoming posts',
    steps: [
      'These are the next 5 posts scheduled to publish across all your active calendars.',
      'Each card shows the platform, caption, and exact scheduled time.',
      'Click a card to expand the full caption and hashtags.',
      'Posts publish automatically — no action needed from you.',
    ],
  },
};

const HelpPanel = ({ activeTab }) => {
  const [open, setOpen] = useState(false);
  const tabKey = activeTab === 'campaigns' ? 'dashboard' : activeTab === 'calendars' ? 'calendars' : 'posts';
  const help = PORTAL_HELP[tabKey];

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100 }}>
      {open && (
        <div style={{
          marginBottom: '0.75rem',
          background: 'rgba(15,10,30,0.97)',
          border: '1px solid rgba(147,51,234,0.4)',
          borderRadius: '14px',
          padding: '1.25rem',
          width: '300px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{help.title}</p>
          <ol style={{ margin: 0, padding: '0 0 0 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {help.steps.map((s, i) => (
              <li key={i} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: open ? '#9333EA' : 'rgba(147,51,234,0.2)',
          border: '1px solid rgba(147,51,234,0.5)',
          color: '#fff',
          fontSize: '1.1rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
          marginLeft: 'auto',
        }}
        title="Help"
      >
        ?
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Wire HelpPanel into the portal render**

Find where the portal JSX returns the main dashboard content (look for the tab content area). At the bottom of the outermost returned `<div>` (before the closing tag of the main container), add:

```jsx
<HelpPanel activeTab={activeTab} />
```

Where `activeTab` is whatever state variable tracks the current tab in the portal (look for `useState` managing tab selection — it's likely named `activeTab` or `tab`).

- [ ] **Step 3: Verify in browser**

Navigate to `/client-portal` and log in. A `?` button should appear in the bottom-right corner. Clicking it should open a contextual help card relevant to the current tab. Switch tabs and re-open — the content should change.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ClientPortal.jsx
git commit -m "feat: add contextual help panel to client portal"
```

---

## Phase 2 — Brand DNA

### Task 4: Create brandDnaService.js

**Files:**
- Create: `functions/contentPipeline/services/brandDnaService.js`

- [ ] **Step 1: Create `functions/contentPipeline/services/brandDnaService.js`**

```javascript
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
```

- [ ] **Step 2: Verify the file is syntactically valid**

Run from the `functions/` directory:
```bash
node -e "require('./contentPipeline/services/brandDnaService')" && echo "OK"
```
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add functions/contentPipeline/services/brandDnaService.js
git commit -m "feat: add brandDnaService - signal extraction and profile management"
```

---

### Task 5: Inject Brand DNA into content generation

**Files:**
- Modify: `functions/contentPipeline/services/promptTemplates.js`
- Modify: `functions/contentPipeline/services/aiService.js`

- [ ] **Step 1: Update `promptTemplates.js` to accept a brand DNA prefix**

Open `functions/contentPipeline/services/promptTemplates.js`.

Change the `getContentCalendarPrompt` export from:
```javascript
exports.getContentCalendarPrompt = ({ businessName, industry, targetAudience, campaignGoal }) => `You are a senior marketing strategist...
```

To:
```javascript
exports.getContentCalendarPrompt = ({ businessName, industry, targetAudience, campaignGoal, brandDnaPrefix = '' }) => `${brandDnaPrefix}You are a senior marketing strategist...
```

(Only change the function signature and the first line of the template string — add `${brandDnaPrefix}` at the very start.)

- [ ] **Step 2: Update `aiService.js` to fetch the Brand DNA profile and inject it**

Open `functions/contentPipeline/services/aiService.js`.

Add the require at the top (after the existing requires):
```javascript
const { getProfile, buildPromptPrefix } = require('./brandDnaService');
```

Change `generateContentCalendar` from:
```javascript
const generateContentCalendar = async (briefData) => {
  const prompt = promptTemplates.getContentCalendarPrompt(briefData);
```

To:
```javascript
const generateContentCalendar = async (briefData, clientId = null) => {
  let brandDnaPrefix = '';
  if (clientId) {
    try {
      const profile = await getProfile(clientId);
      brandDnaPrefix = buildPromptPrefix(profile);
    } catch (err) {
      // non-blocking — generation continues without Brand DNA
    }
  }
  const prompt = promptTemplates.getContentCalendarPrompt({ ...briefData, brandDnaPrefix });
```

- [ ] **Step 3: Pass clientId through from `onContentBriefSubmitted.js`**

Open `functions/contentPipeline/triggers/onContentBriefSubmitted.js`.

Find the line:
```javascript
const rawCalendar = await generateContentCalendar(aiParams);
```

Change it to:
```javascript
const rawCalendar = await generateContentCalendar(aiParams, clientId);
```

The `clientId` variable is already declared earlier in the function (line 24).

- [ ] **Step 4: Pass clientId through from `onCalendarRevisionRequested.js`**

Open `functions/contentPipeline/triggers/onCalendarRevisionRequested.js`.

Find the line:
```javascript
const revisedCalendar = await generateContentCalendar(aiParams);
```

Change it to:
```javascript
const revisedCalendar = await generateContentCalendar(aiParams, clientId);
```

The `clientId` variable is already destructured from `after` (line ~27).

- [ ] **Step 5: Verify syntax of modified files**

Run from `functions/`:
```bash
node -e "require('./contentPipeline/services/aiService')" && echo "OK"
node -e "require('./contentPipeline/triggers/onContentBriefSubmitted')" && echo "OK"
```
Expected: `OK` for both

- [ ] **Step 6: Commit**

```bash
git add functions/contentPipeline/services/promptTemplates.js \
        functions/contentPipeline/services/aiService.js \
        functions/contentPipeline/triggers/onContentBriefSubmitted.js \
        functions/contentPipeline/triggers/onCalendarRevisionRequested.js
git commit -m "feat: inject Brand DNA profile into content calendar generation prompt"
```

---

### Task 6: Record Brand DNA signals on revision and approval

**Files:**
- Modify: `functions/contentPipeline/triggers/onCalendarRevisionRequested.js`
- Modify: `functions/contentPipeline/endpoints/approveContent.js`

- [ ] **Step 1: Call `updateProfileOnRevision` in `onCalendarRevisionRequested.js`**

Open `functions/contentPipeline/triggers/onCalendarRevisionRequested.js`.

Add the require at the top:
```javascript
const { updateProfileOnRevision } = require('../services/brandDnaService');
```

Find the block that fetches brief and client data in parallel:
```javascript
const [briefSnap, clientSnap] = await Promise.all([...]);
```

Immediately after the check that both exist, add:
```javascript
// Update Brand DNA profile with revision feedback (non-blocking)
updateProfileOnRevision(clientId, clientData.name || briefData.businessName, clientFeedback)
  .catch(err => logger.warn('Brand DNA update failed:', err.message));
```

- [ ] **Step 2: Call `updateProfileOnApproval` in `approveContent.js`**

Open `functions/contentPipeline/endpoints/approveContent.js`.

Add the require at the top:
```javascript
const { updateProfileOnApproval } = require('../services/brandDnaService');
```

Inside the `POST /:token/approve` handler, after the line that updates the `contentBriefs` status (step 2 in the existing code, around line 257), add:
```javascript
// Update Brand DNA profile — non-blocking
const clientName = clientData.name || '';
updateProfileOnApproval(data.clientId, clientName)
  .catch(err => console.warn('Brand DNA approval update failed:', err.message));
```

- [ ] **Step 3: Verify syntax**

Run from `functions/`:
```bash
node -e "require('./contentPipeline/triggers/onCalendarRevisionRequested')" && echo "OK"
node -e "require('./contentPipeline/endpoints/approveContent')" && echo "OK"
```
Expected: `OK` for both

- [ ] **Step 4: Commit**

```bash
git add functions/contentPipeline/triggers/onCalendarRevisionRequested.js \
        functions/contentPipeline/endpoints/approveContent.js
git commit -m "feat: record Brand DNA signals on calendar revision and approval"
```

---

## Phase 3 — Image Generation

### Task 7: Create imageGenService.js

**Files:**
- Create: `functions/contentPipeline/services/imageGenService.js`

- [ ] **Step 1: Create `functions/contentPipeline/services/imageGenService.js`**

```javascript
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

const PROJECT_ID = 'freeflow-media';
const LOCATION = 'us-central1';
const IMAGEN_ENDPOINT = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict`;

const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

async function getAuthToken() {
  const client = await googleAuth.getClient();
  const res = await client.getAccessToken();
  return res.token;
}

async function generateImageBase64(prompt) {
  const token = await getAuthToken();
  const response = await axios.post(
    IMAGEN_ENDPOINT,
    {
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg',
        safetyFilterLevel: 'block_some',
        personGeneration: 'allow_adult',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );
  return response.data.predictions[0].bytesBase64Encoded;
}

async function uploadImageToStorage(base64Data, storagePath) {
  const buffer = Buffer.from(base64Data, 'base64');
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    contentType: 'image/jpeg',
    metadata: { cacheControl: 'public, max-age=31536000' },
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

function buildImagePrompt(post, brandProfile) {
  const platform = post.platform || 'social media';
  const visualDesc = post.visualDescription || post.visual || '';
  if (!visualDesc) return null;

  const toneContext = brandProfile?.toneSignals?.length
    ? `Style: ${brandProfile.toneSignals.slice(0, 3).join(', ')}.`
    : '';

  return `Social media image for ${platform}. ${visualDesc} ${toneContext} High quality, vibrant, professional, suitable for ${platform}. No text overlays. No logos. No watermarks.`.trim();
}

async function generateImagesForCalendar(posts, clientId, calendarId, brandProfile = null) {
  const BATCH_SIZE = 5;
  const results = [...posts];

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (post, batchIndex) => {
        const globalIndex = i + batchIndex;
        const day = post.day || globalIndex + 1;
        const prompt = buildImagePrompt(post, brandProfile);
        if (!prompt) return { index: globalIndex, imageUrl: null };

        const storagePath = `clients/${clientId}/calendars/${calendarId}/day-${day}.jpg`;
        const base64 = await generateImageBase64(prompt);
        const imageUrl = await uploadImageToStorage(base64, storagePath);
        return { index: globalIndex, imageUrl };
      })
    );

    batchResults.forEach((result, batchIndex) => {
      const globalIndex = i + batchIndex;
      if (result.status === 'fulfilled' && result.value.imageUrl) {
        results[globalIndex] = { ...posts[globalIndex], imageUrl: result.value.imageUrl };
      } else {
        if (result.status === 'rejected') {
          logger.warn(`Image generation failed for post ${globalIndex}:`, result.reason?.message);
        }
        results[globalIndex] = { ...posts[globalIndex], imageUrl: null };
      }
    });
  }

  return results;
}

module.exports = { generateImagesForCalendar };
```

- [ ] **Step 2: Verify syntax**

Run from `functions/`:
```bash
node -e "require('./contentPipeline/services/imageGenService')" && echo "OK"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add functions/contentPipeline/services/imageGenService.js
git commit -m "feat: add imageGenService - Imagen 3 generation and Firebase Storage upload"
```

---

### Task 8: Integrate image generation into the content pipeline

**Files:**
- Modify: `functions/contentPipeline/triggers/onContentBriefSubmitted.js`
- Modify: `functions/contentPipeline/triggers/onCalendarRevisionRequested.js`

- [ ] **Step 1: Add image generation to `onContentBriefSubmitted.js`**

Open `functions/contentPipeline/triggers/onContentBriefSubmitted.js`.

Add requires at the top:
```javascript
const { generateImagesForCalendar } = require('../services/imageGenService');
const { getProfile } = require('../services/brandDnaService');
```

Find the block where the calendar document is created in Firestore (around line 70-80). It currently does:
```javascript
const calendarRef = db.collection('contentCalendar').doc();
await calendarRef.set({
    briefId: briefId,
    clientId: clientId,
    calendarData: generatedCalendar,
    ...
```

Before the `calendarRef.set()` call, add the image generation step:
```javascript
// Generate images for each post (non-blocking on failure)
let calendarWithImages = generatedCalendar;
try {
  const posts = Array.isArray(generatedCalendar)
    ? generatedCalendar
    : (generatedCalendar?.posts || []);
  const brandProfile = await getProfile(clientId);
  const calendarRef_temp = db.collection('contentCalendar').doc(); // get the ID first
  const postsWithImages = await generateImagesForCalendar(posts, clientId, calendarRef_temp.id, brandProfile);
  calendarWithImages = Array.isArray(generatedCalendar)
    ? postsWithImages
    : { ...generatedCalendar, posts: postsWithImages };
} catch (imgErr) {
  logger.warn('Image generation failed, continuing without images:', imgErr.message);
}
```

Then replace the `db.collection('contentCalendar').doc()` line with the ref already created above, and use `calendarWithImages` instead of `generatedCalendar` in the `set()` call.

> **Note:** The `calendarRef_temp` pattern above won't work cleanly since we need the ID before saving. Instead, generate the ref ID upfront with `const calendarRef = db.collection('contentCalendar').doc();` before the image gen block, pass `calendarRef.id` to `generateImagesForCalendar`, then use `calendarRef` in the subsequent `.set()`. Here is the refactored block that replaces everything from `const calendarRef = db.collection('contentCalendar').doc();` through `await calendarRef.set({...})`:

```javascript
// Pre-generate the calendar document ID so we can use it for storage paths
const calendarRef = db.collection('contentCalendar').doc();

// Generate images for each post (non-blocking on failure)
let calendarWithImages = generatedCalendar;
try {
  const rawPosts = Array.isArray(generatedCalendar)
    ? generatedCalendar
    : (generatedCalendar?.posts || []);
  const brandProfile = await getProfile(clientId);
  const postsWithImages = await generateImagesForCalendar(rawPosts, clientId, calendarRef.id, brandProfile);
  calendarWithImages = Array.isArray(generatedCalendar)
    ? postsWithImages
    : { ...generatedCalendar, posts: postsWithImages };
} catch (imgErr) {
  logger.warn('Image generation skipped:', imgErr.message);
}

await calendarRef.set({
  briefId: briefId,
  clientId: clientId,
  calendarData: calendarWithImages,
  status: 'awaiting_approval',
  approvalToken: approvalToken,
  approvalLink: approvalLink,
  createdAt: admin.firestore.FieldValue.serverTimestamp()
});
```

- [ ] **Step 2: Add image generation to `onCalendarRevisionRequested.js`**

Open `functions/contentPipeline/triggers/onCalendarRevisionRequested.js`.

Add requires at the top:
```javascript
const { generateImagesForCalendar } = require('../services/imageGenService');
const { getProfile } = require('../services/brandDnaService');
```

Find where `revisedCalendar` is used to update the Firestore document. Before the `event.data.after.ref.update({...})` call, add:

```javascript
// Generate images for the revised calendar
let calendarWithImages = revisedCalendar;
try {
  const rawPosts = Array.isArray(revisedCalendar)
    ? revisedCalendar
    : (revisedCalendar?.posts || []);
  const brandProfile = await getProfile(clientId);
  const postsWithImages = await generateImagesForCalendar(rawPosts, clientId, calendarId, brandProfile);
  calendarWithImages = Array.isArray(revisedCalendar)
    ? postsWithImages
    : { ...revisedCalendar, posts: postsWithImages };
} catch (imgErr) {
  logger.warn('Image generation skipped on revision:', imgErr.message);
}
```

Then in the `ref.update()` call, change `calendarData: revisedCalendar` to `calendarData: calendarWithImages`.

- [ ] **Step 3: Verify syntax**

Run from `functions/`:
```bash
node -e "require('./contentPipeline/triggers/onContentBriefSubmitted')" && echo "OK"
node -e "require('./contentPipeline/triggers/onCalendarRevisionRequested')" && echo "OK"
```
Expected: `OK` for both

- [ ] **Step 4: Commit**

```bash
git add functions/contentPipeline/triggers/onContentBriefSubmitted.js \
        functions/contentPipeline/triggers/onCalendarRevisionRequested.js
git commit -m "feat: integrate Imagen 3 image generation into content calendar pipeline"
```

---

### Task 9: Show generated images in the approval review page

**Files:**
- Modify: `functions/contentPipeline/endpoints/approveContent.js`

- [ ] **Step 1: Update the `postsHtml` loop to include the image**

Open `functions/contentPipeline/endpoints/approveContent.js`.

Find the `posts.forEach((post, i) => {` loop that builds `postsHtml` (around line 76). Inside the loop, find where the post variables are extracted:

```javascript
const platform = post.platform || post.type || 'Social';
const content = post.description || post.visual || post.hook || post.content || '';
const visual = post.visualDescription || post.visual || 'N/A';
const hashtags = post.hashtags || '';
const date = post.date || post.scheduledDate || `Day ${i + 1}`;
```

Add one line after these:
```javascript
const imageUrl = post.imageUrl || null;
```

Then find the `postsHtml +=` template string. Inside the `<div class="space-y-3">` block, add the image section before the caption section:

```javascript
${imageUrl ? `
<div>
  <img src="${imageUrl}" alt="AI-generated visual for day ${i + 1}"
    style="width:100%;border-radius:8px;object-fit:cover;max-height:300px;margin-bottom:0.5rem;" 
    loading="lazy" />
</div>` : ''}
```

- [ ] **Step 2: Verify syntax**

Run from `functions/`:
```bash
node -e "require('./contentPipeline/endpoints/approveContent')" && echo "OK"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add functions/contentPipeline/endpoints/approveContent.js
git commit -m "feat: show AI-generated images in calendar approval review page"
```

---

### Task 10: Show images in the Client Portal PostCard

**Files:**
- Modify: `src/pages/ClientPortal.jsx`

- [ ] **Step 1: Update the `PostCard` component to render images**

Open `src/pages/ClientPortal.jsx`. Find the `PostCard` component (around line 42). Inside the returned JSX, find the outer `<div>` that wraps the post content. Add an image block just above the `<div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>` line:

```jsx
{post.imageUrl && (
  <img
    src={post.imageUrl}
    alt={`Post visual - day ${post.day || ''}`}
    style={{
      width: '100%',
      borderRadius: '8px',
      objectFit: 'cover',
      maxHeight: '220px',
      marginBottom: '0.75rem',
      display: 'block',
    }}
    loading="lazy"
  />
)}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Log in to the client portal. Expand a post card — if it has an `imageUrl` in Firestore it will render. If no images yet (existing data), cards show as before (null-safe).

- [ ] **Step 3: Commit**

```bash
git add src/pages/ClientPortal.jsx
git commit -m "feat: render AI-generated post images in client portal PostCard"
```

---

## Phase 4 — Deploy

### Task 11: Build frontend and deploy everything

- [ ] **Step 1: Run the frontend build and confirm no errors**

```bash
npm run build
```
Expected: Build completes with no errors. Output in `dist/`.

- [ ] **Step 2: Deploy Cloud Functions**

```bash
cd functions && firebase deploy --only functions
```
Expected: All functions deploy successfully. Watch for any function-specific errors in the output.

- [ ] **Step 3: Deploy frontend hosting**

```bash
cd .. && firebase deploy --only hosting
```
Expected: Hosting deployed. Firebase prints the live URL.

- [ ] **Step 4: Smoke test in production**

1. Open the live site. Confirm "Guides" appears in the navbar.
2. Navigate to `/guides` — all 7 cards should be present and expandable.
3. Log in to the client portal — confirm the `?` help button appears bottom-right.
4. In the Firebase console → Firestore → check `brandProfiles` collection exists (will populate when first client submits a revision).
5. In Firebase console → Storage → confirm the `clients/` path structure exists (will populate when first calendar generates with images).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: deploy Brand DNA, Image Generation, and Guides to production"
```

---

## Summary

| Feature | New Files | Modified Files |
|---|---|---|
| Guides | `src/pages/Guides.jsx` | `src/App.jsx`, `src/components/Navbar.jsx`, `src/pages/ClientPortal.jsx` |
| Brand DNA | `functions/.../brandDnaService.js` | `aiService.js`, `promptTemplates.js`, `onContentBriefSubmitted.js`, `onCalendarRevisionRequested.js`, `approveContent.js` |
| Image Gen | `functions/.../imageGenService.js` | `onContentBriefSubmitted.js`, `onCalendarRevisionRequested.js`, `approveContent.js`, `src/pages/ClientPortal.jsx` |
