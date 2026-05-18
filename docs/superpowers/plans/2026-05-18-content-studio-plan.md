# Content Studio — Plan A: Core UI Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `/marketing-generator` into a dual-mode page — preserving the existing strategy wizard and adding a full-screen professional Content Studio with 30 content types, brand voice memory, version history, content calendar, bulk generation, and repurposing.

**Architecture:** New `contentGeneratorProxy` Cloud Function (Gemini 2.0 Flash via existing `getAI()`) handles generation with rate limiting. React components render a 3-panel Focus Mode layout (icon rail + type sidebar + workspace + history panel). All data persists in `content_generations` Firestore collection. Brand voice stored in both localStorage and `brandVoiceProfiles` Firestore.

**Tech Stack:** React 19, Vite, Firebase Cloud Functions v2, Gemini 2.0 Flash, Framer Motion, Lucide React, jsPDF, react-hot-toast. Theme: `#0A0A0A` bg, `#9333EA` purple.

**Spec:** `docs/superpowers/specs/2026-05-18-content-studio-design.md`

---

## File Map

| File | Action |
|---|---|
| `functions/index.js` | Add `contentGeneratorProxy` + `buildContentPrompt` helper |
| `src/firebase/config.js` | Add `CONTENT_GENERATOR_PROXY_URL` export |
| `src/services/contentStudioService.js` | New — Firestore CRUD + generate fetch |
| `src/pages/ContentStudio.css` | New — all Content Studio styles |
| `src/components/BrandVoicePanel.jsx` | New — inline brand voice editor |
| `src/components/ContentTypePanel.jsx` | New — searchable content type sidebar |
| `src/components/ContentOutput.jsx` | New — output area, edit mode, versions, share |
| `src/pages/ContentStudio.jsx` | New — main 3-panel shell + constants |
| `src/components/StudioAnalytics.jsx` | New — Analytics A (usage) + B (performance tracker) |
| `src/components/ContentCalendar.jsx` | New — monthly calendar grid |
| `src/components/BulkGenerator.jsx` | New — 13-item sequential bulk generator |
| `src/components/RepurposePanel.jsx` | New — cross-platform repurpose panel |
| `src/pages/MarketingGenerator.jsx` | Modify — add mode toggle, render ContentStudio |
| `index.html` | Fix og:url, twitter:url, og:image meta tags |

---

## Task 1: contentGeneratorProxy Cloud Function

**Files:**
- Modify: `functions/index.js`

- [ ] **Step 1: Add `buildContentPrompt` helper and `contentGeneratorProxy` to `functions/index.js`**

Add this block after the existing `getAI()` helper (after line ~74) and before the `generateStrategy` export:

```javascript
// ==================== CONTENT STUDIO HELPERS ====================

const buildContentPrompt = ({ contentType, tone, brief, businessContext, targetAudience, brandVoice }) => {
  const bv = brandVoice || {};
  const brandSection = bv.businessName ? `
Brand Voice Profile:
- Business: ${bv.businessName}
- Industry: ${bv.industry || 'Not specified'}
- Target Audience: ${bv.targetAudience || targetAudience || 'Not specified'}
- Brand Words: ${(bv.brandWords || []).filter(Boolean).join(', ') || 'Not specified'}
- Core Services: ${bv.coreServices || 'Not specified'}
- Location: ${bv.location || 'Not specified'}` : '';

  return `You are an expert marketing copywriter producing ${contentType} content for a South African marketing agency client.
${brandSection}
${businessContext ? `Business/Brand Context: ${businessContext}` : ''}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

Content Brief:
${brief}

Tone: ${tone}
Content Type: ${contentType}

HUMANIZER RULES — apply every one:
- No em dashes (—)
- Never open with "I hope this finds you well" or any equivalent filler
- No rule-of-three bullet lists
- No sentence starting with an -ing verb
- Mix sentence lengths: short punchy lines alongside longer flowing ones
- Use contractions throughout (I'm, we've, don't, it's, you're)
- No corporate buzzwords: leverage, synergy, robust, seamlessly, holistic, ecosystem
- Single specific CTA only — never multiple asks
- Reference the client's specific context in the very first line

Write the ${contentType} now. Output ONLY the final content — no explanations, no preamble, no "Here is your..." intro.`;
};

// ==================== CONTENT STUDIO ====================

exports.contentGeneratorProxy = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { contentType, category, tone, brief, businessContext, targetAudience, brandVoice, userEmail } = req.body;

      if (!contentType || !tone || !brief || !userEmail) {
        return res.status(400).json({ error: "Missing required fields: contentType, tone, brief, userEmail" });
      }
      if (typeof brief !== "string" || brief.length > 2000) {
        return res.status(400).json({ error: "Brief must be a string under 2000 characters" });
      }
      if (typeof contentType !== "string" || contentType.length > 100) {
        return res.status(400).json({ error: "Invalid contentType" });
      }

      // Rate limit: 20 req/user/hour
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentSnap = await db.collection("content_generations")
          .where("userEmail", "==", userEmail)
          .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(oneHourAgo))
          .get();
        if (recentSnap.size >= 20) {
          return res.status(429).json({ error: "Rate limit exceeded. Max 20 generations per hour." });
        }

        const prompt = buildContentPrompt({ contentType, tone, brief, businessContext, targetAudience, brandVoice });
        const response = await getAI().models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
        });
        const output = response.text;

        const docRef = await db.collection("content_generations").add({
          userEmail,
          contentType,
          category: category || "General",
          tone,
          prompt: brief,
          output,
          charCount: output.length,
          version: 1,
          status: "draft",
          scheduledDate: null,
          platformVariants: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(200).json({ output, generationId: docRef.id });
      } catch (err) {
        logger.error("contentGeneratorProxy error:", err);
        return res.status(500).json({ error: "Generation failed. Please try again." });
      }
    });
  }
);
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media/functions" && node -e "require('.')" 2>&1 | head -20
```

Expected: No output or only deprecation warnings — no `SyntaxError`.

- [ ] **Step 3: Deploy the new function**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && firebase deploy --only functions:contentGeneratorProxy
```

Expected: `✔ Deploy complete!`

- [ ] **Step 4: Commit**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && git add functions/index.js && git commit -m "feat: add contentGeneratorProxy Cloud Function with Gemini 2.0 Flash and rate limiting"
```

---

## Task 2: Service Layer + Firebase Config

**Files:**
- Modify: `src/firebase/config.js`
- Create: `src/services/contentStudioService.js`

- [ ] **Step 1: Add proxy URL to `src/firebase/config.js`**

Add after the last existing export line:

```javascript
export const CONTENT_GENERATOR_PROXY_URL = "https://us-central1-freeflow-media.cloudfunctions.net/contentGeneratorProxy";
```

- [ ] **Step 2: Create `src/services/contentStudioService.js`**

```javascript
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
```

- [ ] **Step 3: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -15
```

Expected: `✓ built in` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/firebase/config.js src/services/contentStudioService.js && git commit -m "feat: add contentStudioService and proxy URL config"
```

---

## Task 3: ContentStudio.css

**Files:**
- Create: `src/pages/ContentStudio.css`

- [ ] **Step 1: Create the stylesheet**

```css
/* ContentStudio.css */

.cs-shell {
  display: flex;
  height: 100vh;
  background: #0A0A0A;
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
  position: fixed;
  inset: 0;
  z-index: 100;
}

/* ICON RAIL */
.cs-rail {
  width: 52px;
  min-width: 52px;
  background: #111111;
  border-right: 1px solid #1E1E1E;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 4px;
}

.cs-rail-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #52525B;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.cs-rail-btn:hover { background: #1E1E1E; color: #A1A1AA; }
.cs-rail-btn.active { background: rgba(147,51,234,0.15); color: #9333EA; }

.cs-rail-spacer { flex: 1; }

.cs-rail-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #9333EA;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  margin-bottom: 8px;
}

.cs-rail-btn[data-tip]::after {
  content: attr(data-tip);
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: #1E1E1E;
  color: #E4E4E7;
  font-size: 0.7rem;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  border: 1px solid #2A2A2A;
  z-index: 20;
  transition: opacity 0.1s;
}
.cs-rail-btn[data-tip]:hover::after { opacity: 1; }

/* TYPE PANEL */
.cs-type-panel {
  width: 200px;
  min-width: 200px;
  background: #0F0F0F;
  border-right: 1px solid #1E1E1E;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cs-type-search {
  padding: 10px;
  border-bottom: 1px solid #1E1E1E;
}

.cs-type-search input {
  width: 100%;
  background: #1A1A1A;
  border: 1px solid #2A2A2A;
  border-radius: 6px;
  padding: 6px 10px;
  color: #E4E4E7;
  font-size: 0.75rem;
  outline: none;
  box-sizing: border-box;
}
.cs-type-search input::placeholder { color: #3F3F46; }
.cs-type-search input:focus { border-color: #9333EA; }

.cs-type-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.cs-type-list::-webkit-scrollbar { width: 3px; }
.cs-type-list::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }

.cs-category-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9333EA;
  padding: 10px 12px 4px;
}

.cs-type-item {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  padding: 6px 12px;
  color: #71717A;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.1s;
}
.cs-type-item:hover { color: #A1A1AA; background: #141414; }
.cs-type-item.active { border-left-color: #9333EA; color: #E4E4E7; background: rgba(147,51,234,0.06); }

/* WORKSPACE */
.cs-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.cs-topbar {
  height: 48px;
  min-height: 48px;
  border-bottom: 1px solid #1E1E1E;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 10px;
  background: #0A0A0A;
}

.cs-breadcrumb {
  font-size: 0.78rem;
  color: #52525B;
  white-space: nowrap;
}
.cs-breadcrumb span { color: #E4E4E7; }

.cs-topbar-sep {
  width: 1px;
  height: 16px;
  background: #2A2A2A;
  flex-shrink: 0;
}

.cs-tones {
  display: flex;
  gap: 4px;
  align-items: center;
  overflow: hidden;
}

.cs-tone-pill {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 500;
  border: 1px solid #2A2A2A;
  background: transparent;
  color: #71717A;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.1s;
}
.cs-tone-pill:hover { color: #A1A1AA; border-color: #3F3F46; }
.cs-tone-pill.active { background: rgba(147,51,234,0.15); border-color: #9333EA; color: #C084FC; }

.cs-tone-more-wrap { position: relative; }

.cs-tone-more {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 500;
  border: 1px solid #2A2A2A;
  background: transparent;
  color: #52525B;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.1s;
}
.cs-tone-more:hover { border-color: #3F3F46; color: #71717A; }

.cs-tone-overflow {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #1A1A1A;
  border: 1px solid #2A2A2A;
  border-radius: 8px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 130px;
  z-index: 10;
}
.cs-tone-overflow .cs-tone-pill {
  border-radius: 6px;
  width: 100%;
  text-align: left;
  border-color: transparent;
}

/* BODY SPLIT */
.cs-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.cs-form-side {
  width: 260px;
  min-width: 260px;
  border-right: 1px solid #1E1E1E;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  overflow-y: auto;
}
.cs-form-side::-webkit-scrollbar { width: 3px; }
.cs-form-side::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }

.cs-form-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: #52525B;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.cs-form-input,
.cs-form-textarea {
  width: 100%;
  background: #111111;
  border: 1px solid #2A2A2A;
  border-radius: 6px;
  padding: 8px 10px;
  color: #E4E4E7;
  font-size: 0.8rem;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.cs-form-input::placeholder,
.cs-form-textarea::placeholder { color: #3F3F46; }
.cs-form-input:focus,
.cs-form-textarea:focus { border-color: #9333EA; }
.cs-form-textarea { resize: vertical; min-height: 90px; }

.cs-brand-voice-banner {
  background: rgba(147,51,234,0.08);
  border: 1px solid rgba(147,51,234,0.25);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.72rem;
  color: #C084FC;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cs-generate-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #9333EA, #7C3AED);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s;
}
.cs-generate-btn:hover:not(:disabled) { opacity: 0.9; }
.cs-generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* OUTPUT SIDE */
.cs-output-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.cs-output-header {
  height: 44px;
  border-bottom: 1px solid #1E1E1E;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 8px;
}

.cs-output-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #71717A;
  flex: 1;
}

.cs-output-btn {
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid #2A2A2A;
  background: transparent;
  color: #71717A;
  font-size: 0.72rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.1s;
}
.cs-output-btn:hover { border-color: #3F3F46; color: #A1A1AA; }
.cs-output-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.cs-output-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-size: 0.88rem;
  line-height: 1.7;
  color: #E4E4E7;
  white-space: pre-wrap;
  outline: none;
  min-height: 0;
}
.cs-output-content::-webkit-scrollbar { width: 3px; }
.cs-output-content::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
.cs-output-content.editing {
  border: 1px solid #9333EA;
  border-radius: 8px;
  margin: 8px;
  padding: 14px;
}

.cs-output-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #3F3F46;
  text-align: center;
  font-size: 0.82rem;
}

.cs-char-bar { padding: 6px 16px; border-top: 1px solid #1E1E1E; }

.cs-char-track {
  height: 2px;
  background: #1E1E1E;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 5px;
}

.cs-char-fill {
  height: 100%;
  background: #9333EA;
  border-radius: 2px;
  transition: width 0.2s;
}
.cs-char-fill.over { background: #EF4444; }

.cs-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 16px 8px;
  border-top: 1px solid #1E1E1E;
  flex-wrap: wrap;
}

.cs-meta-chip {
  font-size: 0.65rem;
  color: #52525B;
  background: #111111;
  border: 1px solid #1E1E1E;
  border-radius: 4px;
  padding: 2px 7px;
}

.cs-meta-chip.version {
  color: #9333EA;
  border-color: rgba(147,51,234,0.3);
  background: rgba(147,51,234,0.05);
}

.cs-version-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.cs-version-nav button {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #2A2A2A;
  background: transparent;
  color: #52525B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.1s;
}
.cs-version-nav button:hover:not(:disabled) { border-color: #3F3F46; color: #A1A1AA; }
.cs-version-nav button:disabled { opacity: 0.3; cursor: default; }

.cs-share-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-top: 1px solid #1E1E1E;
  flex-wrap: wrap;
}

.cs-share-btn {
  height: 26px;
  padding: 0 9px;
  border-radius: 5px;
  border: 1px solid #1E1E1E;
  background: #111111;
  color: #52525B;
  font-size: 0.67rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.1s;
}
.cs-share-btn:hover { border-color: #2A2A2A; color: #71717A; }

/* HISTORY PANEL */
.cs-history-panel {
  width: 200px;
  min-width: 200px;
  background: #0F0F0F;
  border-left: 1px solid #1E1E1E;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cs-history-header {
  height: 44px;
  border-bottom: 1px solid #1E1E1E;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #71717A;
}

.cs-history-list { flex: 1; overflow-y: auto; }
.cs-history-list::-webkit-scrollbar { width: 3px; }
.cs-history-list::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }

.cs-history-item {
  padding: 10px 12px;
  border-left: 2px solid transparent;
  border-bottom: 1px solid #141414;
  cursor: pointer;
  transition: all 0.1s;
}
.cs-history-item:hover { background: #141414; }
.cs-history-item.active { border-left-color: #9333EA; background: rgba(147,51,234,0.04); }

.cs-history-type {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9333EA;
  margin-bottom: 3px;
}

.cs-history-preview {
  font-size: 0.72rem;
  color: #52525B;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cs-history-time {
  font-size: 0.62rem;
  color: #3F3F46;
  margin-top: 4px;
}

.cs-history-empty {
  padding: 24px 12px;
  font-size: 0.72rem;
  color: #3F3F46;
  text-align: center;
}

/* PANEL VIEWS */
.cs-panel-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cs-panel-header {
  height: 48px;
  border-bottom: 1px solid #1E1E1E;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #E4E4E7;
  gap: 8px;
}

.cs-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.cs-panel-body::-webkit-scrollbar { width: 4px; }
.cs-panel-body::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }

/* ANALYTICS */
.cs-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.cs-stat-card {
  background: #111111;
  border: 1px solid #1E1E1E;
  border-radius: 10px;
  padding: 14px;
}

.cs-stat-label {
  font-size: 0.65rem;
  color: #52525B;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}

.cs-stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #E4E4E7;
}

.cs-stat-delta { font-size: 0.7rem; margin-top: 2px; }
.cs-stat-delta.up { color: #4ADE80; }
.cs-stat-delta.down { color: #EF4444; }

.cs-section-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: #71717A;
  margin-bottom: 10px;
  margin-top: 20px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cs-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.cs-bar-label { font-size: 0.7rem; color: #71717A; width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cs-bar-track { flex: 1; height: 6px; background: #1A1A1A; border-radius: 3px; overflow: hidden; }
.cs-bar-fill { height: 100%; background: #9333EA; border-radius: 3px; transition: width 0.4s ease; }
.cs-bar-count { font-size: 0.65rem; color: #52525B; min-width: 20px; text-align: right; }

.cs-sparkline { display: flex; align-items: flex-end; gap: 3px; height: 40px; }
.cs-spark-bar {
  flex: 1;
  background: rgba(147,51,234,0.35);
  border-radius: 2px 2px 0 0;
  min-height: 2px;
}

.cs-perf-form {
  background: #111111;
  border: 1px solid #1E1E1E;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}
.cs-perf-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

/* CALENDAR */
.cs-calendar-nav { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.cs-calendar-nav h3 { font-size: 0.9rem; font-weight: 600; color: #E4E4E7; flex: 1; text-align: center; }

.cs-nav-btn {
  width: 30px; height: 30px;
  border-radius: 6px; border: 1px solid #2A2A2A;
  background: transparent; color: #71717A; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.1s;
}
.cs-nav-btn:hover { border-color: #3F3F46; color: #A1A1AA; }

.cs-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #1E1E1E;
  border: 1px solid #1E1E1E;
  border-radius: 8px;
  overflow: hidden;
}

.cs-cal-header-cell {
  background: #111111;
  padding: 6px 4px;
  text-align: center;
  font-size: 0.65rem;
  font-weight: 600;
  color: #52525B;
  text-transform: uppercase;
}

.cs-cal-cell {
  background: #0A0A0A;
  min-height: 80px;
  padding: 4px;
  cursor: pointer;
  transition: background 0.1s;
}
.cs-cal-cell:hover { background: #111111; }
.cs-cal-cell.other-month { opacity: 0.3; }
.cs-cal-cell.today { background: rgba(147,51,234,0.05); }

.cs-cal-day-num { font-size: 0.7rem; color: #52525B; margin-bottom: 4px; }
.cs-cal-day-num.today { color: #9333EA; font-weight: 700; }

.cs-cal-chip {
  font-size: 0.58rem;
  padding: 1px 5px;
  border-radius: 3px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cs-cal-chip.social { background: rgba(147,51,234,0.2); color: #C084FC; }
.cs-cal-chip.email { background: rgba(59,130,246,0.2); color: #60A5FA; }
.cs-cal-chip.ads { background: rgba(34,197,94,0.2); color: #4ADE80; }
.cs-cal-chip.longform { background: rgba(249,115,22,0.2); color: #FB923C; }

/* BULK */
.cs-bulk-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: #111111; border: 1px solid #1E1E1E;
  border-radius: 8px; margin-bottom: 8px;
}
.cs-bulk-status {
  width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.7rem; flex-shrink: 0;
}
.cs-bulk-status.pending { background: #1E1E1E; color: #52525B; }
.cs-bulk-status.active { background: rgba(147,51,234,0.2); color: #9333EA; }
.cs-bulk-status.done { background: rgba(34,197,94,0.15); color: #4ADE80; }
.cs-bulk-status.error { background: rgba(239,68,68,0.15); color: #EF4444; }
.cs-bulk-label { font-size: 0.8rem; color: #A1A1AA; flex: 1; }

.cs-progress-bar { height: 3px; background: #1E1E1E; border-radius: 2px; margin: 12px 0; overflow: hidden; }
.cs-progress-fill { height: 100%; background: linear-gradient(90deg, #9333EA, #7C3AED); border-radius: 2px; transition: width 0.3s ease; }

/* REPURPOSE */
.cs-repurpose-source {
  background: #111111; border: 1px solid #2A2A2A;
  border-radius: 8px; padding: 12px; margin-bottom: 16px;
  font-size: 0.8rem; color: #A1A1AA; line-height: 1.6;
}
.cs-repurpose-variant {
  background: #111111; border: 1px solid #1E1E1E;
  border-radius: 8px; padding: 12px; margin-bottom: 10px;
}
.cs-repurpose-platform {
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #9333EA; margin-bottom: 6px;
}
.cs-repurpose-text { font-size: 0.8rem; color: #A1A1AA; line-height: 1.6; white-space: pre-wrap; }

/* BRAND VOICE */
.cs-bv-panel { max-width: 520px; }
.cs-bv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.cs-bv-words { display: flex; gap: 6px; margin-bottom: 12px; }
.cs-bv-word-input { flex: 1; }

.cs-save-btn {
  padding: 9px 20px;
  background: linear-gradient(135deg, #9333EA, #7C3AED);
  border: none; border-radius: 8px; color: #fff;
  font-size: 0.82rem; font-weight: 600; cursor: pointer;
  transition: opacity 0.15s;
}
.cs-save-btn:hover { opacity: 0.9; }
.cs-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* MODE TOGGLE */
.mg-mode-toggle {
  position: fixed; top: 16px; right: 20px;
  display: flex; background: #111111;
  border: 1px solid #2A2A2A; border-radius: 8px;
  overflow: hidden; z-index: 200;
}
.mg-mode-btn {
  padding: 7px 14px; font-size: 0.75rem; font-weight: 600;
  border: none; background: transparent; color: #52525B; cursor: pointer; transition: all 0.15s;
}
.mg-mode-btn.active { background: #9333EA; color: #fff; }

@media (max-width: 900px) {
  .cs-history-panel { display: none; }
  .cs-type-panel { width: 160px; min-width: 160px; }
}
@media (max-width: 640px) {
  .cs-type-panel { display: none; }
  .cs-form-side { width: 100%; min-width: 0; }
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ContentStudio.css && git commit -m "feat: add ContentStudio CSS — full-screen 3-panel layout styles"
```

---

## Task 4: BrandVoicePanel

**Files:**
- Create: `src/components/BrandVoicePanel.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState, useEffect } from 'react';
import { Heart, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { saveBrandVoice } from '../services/contentStudioService';

const EMPTY = {
  businessName: '',
  industry: '',
  targetAudience: '',
  brandWords: ['', '', ''],
  competitors: '',
  coreServices: '',
  location: '',
};

export default function BrandVoicePanel({ userEmail, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('driftStudio_brandVoice');
    if (cached) {
      const parsed = JSON.parse(cached);
      setForm({ ...EMPTY, ...parsed, brandWords: parsed.brandWords?.length ? parsed.brandWords : ['', '', ''] });
    }
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setWord = (i, val) => setForm(f => {
    const words = [...f.brandWords];
    words[i] = val;
    return { ...f, brandWords: words };
  });

  const handleSave = async () => {
    if (!form.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }
    setSaving(true);
    try {
      await saveBrandVoice(userEmail, form);
      toast.success('Brand voice saved');
      onSave?.(form);
    } catch {
      toast.error('Save failed — stored locally only');
      localStorage.setItem('driftStudio_brandVoice', JSON.stringify(form));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cs-panel-view">
      <div className="cs-panel-header">
        <Heart size={15} />
        Brand Voice
      </div>
      <div className="cs-panel-body">
        <div className="cs-bv-panel">
          <div className="cs-bv-grid">
            <div>
              <div className="cs-form-label">Business Name</div>
              <input className="cs-form-input" value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Drift Studio" />
            </div>
            <div>
              <div className="cs-form-label">Industry</div>
              <input className="cs-form-input" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Digital Marketing" />
            </div>
            <div>
              <div className="cs-form-label">Location</div>
              <input className="cs-form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Cape Town, SA" />
            </div>
            <div>
              <div className="cs-form-label">Competitors</div>
              <input className="cs-form-input" value={form.competitors} onChange={e => set('competitors', e.target.value)} placeholder="Agency X, Agency Y" />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="cs-form-label">Target Audience</div>
            <input className="cs-form-input" value={form.targetAudience} onChange={e => set('targetAudience', e.target.value)} placeholder="SMEs in Cape Town looking to grow online" />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="cs-form-label">Core Services</div>
            <textarea className="cs-form-textarea" style={{ minHeight: 60 }} value={form.coreServices} onChange={e => set('coreServices', e.target.value)} placeholder="Social media management, SEO, PPC campaigns, content creation" />
          </div>

          <div className="cs-form-label">Brand Words (3 words that define your voice)</div>
          <div className="cs-bv-words">
            {form.brandWords.map((w, i) => (
              <input key={i} className="cs-form-input cs-bv-word-input" value={w} onChange={e => setWord(i, e.target.value)} placeholder={['Bold', 'Direct', 'Authentic'][i]} />
            ))}
          </div>

          <button className="cs-save-btn" onClick={handleSave} disabled={saving}>
            <Save size={14} style={{ marginRight: 6 }} />
            {saving ? 'Saving…' : 'Save Brand Voice'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BrandVoicePanel.jsx && git commit -m "feat: add BrandVoicePanel component"
```

---

## Task 5: ContentTypePanel

**Files:**
- Create: `src/components/ContentTypePanel.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState, useMemo } from 'react';

const CONTENT_TYPES = {
  Social: [
    'Instagram Caption', 'Instagram Carousel', 'Facebook Post',
    'LinkedIn Post', 'Twitter / X Thread', 'TikTok Script',
    'YouTube Shorts Script', 'Pinterest Description',
  ],
  Email: [
    'Cold Outreach', 'Newsletter', '3-Email Drip Sequence',
    'Promotional Email', 'Re-engagement Email',
  ],
  'Website Copy': [
    'Hero Headline', 'About Us', 'Service Description',
    'Testimonial Prompt', 'FAQ', 'Meta Tags',
  ],
  Ads: [
    'Google RSA', 'Facebook / Instagram Ad', 'LinkedIn Ad', 'Retargeting Ad',
  ],
  'Long Form': [
    'Blog Outline', 'Full Blog Post', 'Press Release', 'Case Study',
  ],
};

export { CONTENT_TYPES };

export default function ContentTypePanel({ selectedType, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return CONTENT_TYPES;
    const q = search.toLowerCase();
    const result = {};
    Object.entries(CONTENT_TYPES).forEach(([cat, types]) => {
      const matches = types.filter(t => t.toLowerCase().includes(q));
      if (matches.length) result[cat] = matches;
    });
    return result;
  }, [search]);

  return (
    <div className="cs-type-panel">
      <div className="cs-type-search">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search types…"
        />
      </div>
      <div className="cs-type-list">
        {Object.entries(filtered).map(([cat, types]) => (
          <div key={cat}>
            <div className="cs-category-label">{cat}</div>
            {types.map(type => (
              <button
                key={type}
                className={`cs-type-item${selectedType === type ? ' active' : ''}`}
                onClick={() => onSelect(type, cat)}
              >
                {type}
              </button>
            ))}
          </div>
        ))}
        {Object.keys(filtered).length === 0 && (
          <div style={{ padding: '16px 12px', fontSize: '0.72rem', color: '#3F3F46' }}>
            No types match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ContentTypePanel.jsx && git commit -m "feat: add ContentTypePanel with search filtering"
```

---

## Task 6: ContentOutput

**Files:**
- Create: `src/components/ContentOutput.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Edit3, Copy, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateGenerationOutput } from '../services/contentStudioService';

const CHAR_LIMITS = {
  'Instagram Caption': 2200,
  'Instagram Carousel': 2200,
  'Twitter / X Thread': 280,
  'LinkedIn Post': 3000,
  'Facebook Post': 63206,
  'TikTok Script': 2200,
  'Pinterest Description': 500,
  'Google RSA': 90,
  'Meta Tags': 160,
  'Cold Outreach': 200,
  'Newsletter': 5000,
  '3-Email Drip Sequence': 5000,
  'Promotional Email': 3000,
  'Re-engagement Email': 3000,
  'Hero Headline': 100,
};

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function ContentOutput({ contentType, output, versions, currentVersion, generationId, onRegenerate, onVersionChange, isGenerating }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const contentRef = useRef(null);

  const limit = CHAR_LIMITS[contentType] || null;
  const charCount = output?.length || 0;
  const pct = limit ? Math.min(100, (charCount / limit) * 100) : 0;
  const hashCount = output ? (output.match(/#\w+/g) || []).length : 0;

  useEffect(() => {
    setEditing(false);
  }, [output]);

  const startEdit = () => {
    setEditText(output || '');
    setEditing(true);
    setTimeout(() => contentRef.current?.focus(), 50);
  };

  const saveEdit = async () => {
    if (!generationId || editText === output) { setEditing(false); return; }
    try {
      await updateGenerationOutput(generationId, editText);
      toast.success('Saved');
    } catch {
      toast.error('Save failed');
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') saveEdit();
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => toast.success('Copied to clipboard'));
  };

  if (!output && !isGenerating) {
    return (
      <div className="cs-output-side">
        <div className="cs-output-header">
          <span className="cs-output-label">Output</span>
        </div>
        <div className="cs-output-placeholder">
          <Sparkles size={32} />
          <div>Fill in the brief and click Generate</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-output-side">
      <div className="cs-output-header">
        <span className="cs-output-label">
          {isGenerating ? 'Generating…' : contentType}
        </span>
        <button className="cs-output-btn" onClick={onRegenerate} disabled={isGenerating} title="Regenerate">
          <RefreshCw size={12} /> Regenerate
        </button>
        <button className="cs-output-btn" onClick={startEdit} disabled={isGenerating || !output} title="Edit">
          <Edit3 size={12} /> Edit
        </button>
        <button className="cs-output-btn" onClick={copyToClipboard} disabled={!output} title="Copy">
          <Copy size={12} /> Copy
        </button>
      </div>

      {editing ? (
        <textarea
          ref={contentRef}
          className="cs-output-content editing"
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          style={{ resize: 'none' }}
        />
      ) : (
        <div
          className="cs-output-content"
          onClick={output ? startEdit : undefined}
          style={{ cursor: output ? 'text' : 'default' }}
        >
          {isGenerating ? (
            <span style={{ color: '#52525B' }}>Writing your {contentType}…</span>
          ) : output}
        </div>
      )}

      {limit && output && (
        <div className="cs-char-bar">
          <div className="cs-char-track">
            <div className={`cs-char-fill${pct >= 100 ? ' over' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {output && (
        <>
          <div className="cs-meta-row">
            <span className="cs-meta-chip">{charCount.toLocaleString()} chars</span>
            {limit && <span className="cs-meta-chip">/ {limit.toLocaleString()}</span>}
            {hashCount > 0 && <span className="cs-meta-chip">{hashCount} hashtags</span>}
            <span className="cs-meta-chip version">Version {currentVersion + 1} of {versions.length}</span>
            <div className="cs-version-nav">
              <button onClick={() => onVersionChange(currentVersion - 1)} disabled={currentVersion === 0}>
                <ChevronLeft size={10} />
              </button>
              <button onClick={() => onVersionChange(currentVersion + 1)} disabled={currentVersion === versions.length - 1}>
                <ChevronRight size={10} />
              </button>
            </div>
          </div>
          <div className="cs-share-row">
            <button className="cs-share-btn" onClick={copyToClipboard}>
              <Copy size={10} /> Copy
            </button>
            <button className="cs-share-btn" onClick={() => {
              const blob = new Blob([output], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `${contentType.replace(/\s/g, '_')}.txt`;
              a.click(); URL.revokeObjectURL(url);
            }}>
              Download
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ContentOutput.jsx && git commit -m "feat: add ContentOutput with inline edit, version nav, and share actions"
```

---

## Task 7: ContentStudio Main Shell

**Files:**
- Create: `src/pages/ContentStudio.jsx`

- [ ] **Step 1: Create the main shell**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Calendar, Package, RefreshCw, BarChart2, Heart, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ContentTypePanel from '../components/ContentTypePanel';
import ContentOutput from '../components/ContentOutput';
import BrandVoicePanel from '../components/BrandVoicePanel';
import StudioAnalytics from '../components/StudioAnalytics';
import ContentCalendar from '../components/ContentCalendar';
import BulkGenerator from '../components/BulkGenerator';
import RepurposePanel from '../components/RepurposePanel';
import { generateContent, getGenerations, getBrandVoice } from '../services/contentStudioService';
import './ContentStudio.css';

const TONES_PRIMARY = ['Casual', 'Professional', 'Bold', 'Witty', 'Inspirational', 'Educational'];
const TONES_OVERFLOW = ['Urgent', 'Storytelling', 'Luxury', 'Direct', 'Empathetic'];

const PLACEHOLDERS = {
  'Instagram Caption': 'What's the post about? Include any key details, offers, or moments to highlight.',
  'LinkedIn Post': 'Topic, angle, and any data points or personal insight to include.',
  'Cold Outreach': 'Who you're contacting, what you're offering, and the hook.',
  'Blog Outline': 'The topic and target keyword. Any specific sections you want covered.',
  'Google RSA': 'Product or service, key selling points, and target search intent.',
};

function getPlaceholder(contentType) {
  return PLACEHOLDERS[contentType] || `Describe what you need for this ${contentType}.`;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ContentStudio() {
  const { currentUser } = useAuth();
  const userEmail = currentUser?.email || 'guest';

  const [activeNav, setActiveNav] = useState('generate');
  const [selectedType, setSelectedType] = useState('Instagram Caption');
  const [selectedCategory, setSelectedCategory] = useState('Social');
  const [tone, setTone] = useState('Professional');
  const [showMoreTones, setShowMoreTones] = useState(false);
  const [brief, setBrief] = useState('');
  const [businessContext, setBusinessContext] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandVoice, setBrandVoice] = useState(null);
  const [output, setOutput] = useState('');
  const [versions, setVersions] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [generationId, setGenerationId] = useState(null);
  const [repurposeItem, setRepurposeItem] = useState(null);

  useEffect(() => {
    getBrandVoice(userEmail).then(bv => {
      if (bv) {
        setBrandVoice(bv);
        if (bv.businessName) setBusinessContext(bv.businessName);
        if (bv.targetAudience) setTargetAudience(bv.targetAudience);
      }
    });
    loadHistory();
  }, [userEmail]);

  const loadHistory = useCallback(async () => {
    try {
      const items = await getGenerations(userEmail, 50);
      setHistory(items);
    } catch {
      // history not critical
    }
  }, [userEmail]);

  const handleGenerate = async () => {
    if (!brief.trim()) { toast.error('Add a brief first'); return; }
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await generateContent({
        contentType: selectedType,
        category: selectedCategory,
        tone,
        brief,
        businessContext,
        targetAudience,
        brandVoice,
        userEmail,
      });
      const newVersions = [...versions, result.output].slice(-5);
      setVersions(newVersions);
      setCurrentVersion(newVersions.length - 1);
      setOutput(result.output);
      setGenerationId(result.generationId);
      loadHistory();
    } catch (err) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTypeSelect = (type, category) => {
    setSelectedType(type);
    setSelectedCategory(category);
    setOutput('');
    setVersions([]);
    setCurrentVersion(0);
    setGenerationId(null);
  };

  const handleVersionChange = (idx) => {
    if (idx < 0 || idx >= versions.length) return;
    setCurrentVersion(idx);
    setOutput(versions[idx]);
  };

  const handleHistorySelect = (item) => {
    setSelectedType(item.contentType);
    setSelectedCategory(item.category || 'General');
    setOutput(item.output);
    setVersions([item.output]);
    setCurrentVersion(0);
    setGenerationId(item.id);
    setBrief(item.prompt || '');
    setTone(item.tone || 'Professional');
    setActiveNav('generate');
  };

  const initials = userEmail.slice(0, 2).toUpperCase();

  const navItems = [
    { id: 'generate', icon: <Sparkles size={16} />, label: 'Generate' },
    { id: 'calendar', icon: <Calendar size={16} />, label: 'Calendar' },
    { id: 'bulk', icon: <Package size={16} />, label: 'Bulk Pack' },
    { id: 'repurpose', icon: <RefreshCw size={16} />, label: 'Repurpose' },
    { id: 'analytics', icon: <BarChart2 size={16} />, label: 'Analytics' },
    { id: 'brandvoice', icon: <Heart size={16} />, label: 'Brand Voice' },
    { id: 'settings', icon: <Settings size={16} />, label: 'Settings' },
  ];

  const renderMainContent = () => {
    if (activeNav === 'calendar') return <ContentCalendar userEmail={userEmail} history={history} />;
    if (activeNav === 'bulk') return <BulkGenerator userEmail={userEmail} brandVoice={brandVoice} onComplete={loadHistory} />;
    if (activeNav === 'repurpose') return <RepurposePanel userEmail={userEmail} item={repurposeItem} brandVoice={brandVoice} onComplete={loadHistory} />;
    if (activeNav === 'analytics') return <StudioAnalytics userEmail={userEmail} />;
    if (activeNav === 'brandvoice') return <BrandVoicePanel userEmail={userEmail} onSave={bv => { setBrandVoice(bv); if (bv.businessName) setBusinessContext(bv.businessName); if (bv.targetAudience) setTargetAudience(bv.targetAudience); }} />;
    if (activeNav === 'settings') return (
      <div className="cs-panel-view">
        <div className="cs-panel-header"><Settings size={15} /> Settings</div>
        <div className="cs-panel-body" style={{ color: '#52525B', fontSize: '0.82rem' }}>
          Platform integrations and account settings coming in Plan B.
        </div>
      </div>
    );

    // Generate view
    return (
      <>
        <div className="cs-topbar">
          <span className="cs-breadcrumb">{selectedCategory} › <span>{selectedType}</span></span>
          <div className="cs-topbar-sep" />
          <div className="cs-tones">
            {TONES_PRIMARY.map(t => (
              <button key={t} className={`cs-tone-pill${tone === t ? ' active' : ''}`} onClick={() => setTone(t)}>{t}</button>
            ))}
            <div className="cs-tone-more-wrap">
              <button className="cs-tone-more" onClick={() => setShowMoreTones(v => !v)}>
                {TONES_OVERFLOW.includes(tone) ? tone : 'More →'}
              </button>
              {showMoreTones && (
                <div className="cs-tone-overflow">
                  {TONES_OVERFLOW.map(t => (
                    <button key={t} className={`cs-tone-pill${tone === t ? ' active' : ''}`} onClick={() => { setTone(t); setShowMoreTones(false); }}>{t}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="cs-body">
          <div className="cs-form-side">
            <div>
              <div className="cs-form-label">Business / Brand</div>
              <input className="cs-form-input" value={businessContext} onChange={e => setBusinessContext(e.target.value)} placeholder="Your business name or context" />
            </div>
            <div>
              <div className="cs-form-label">Target Audience</div>
              <input className="cs-form-input" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Who is this for?" />
            </div>
            <div>
              <div className="cs-form-label">Brief</div>
              <textarea className="cs-form-textarea" value={brief} onChange={e => setBrief(e.target.value)} placeholder={getPlaceholder(selectedType)} style={{ minHeight: 120 }} />
            </div>
            {brandVoice?.businessName && (
              <div className="cs-brand-voice-banner">
                <Heart size={12} />
                Brand voice active: {brandVoice.businessName}
              </div>
            )}
            <button className="cs-generate-btn" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles size={15} />
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
          </div>

          <ContentOutput
            contentType={selectedType}
            output={output}
            versions={versions}
            currentVersion={currentVersion}
            generationId={generationId}
            onRegenerate={handleGenerate}
            onVersionChange={handleVersionChange}
            isGenerating={isGenerating}
          />
        </div>
      </>
    );
  };

  return (
    <div className="cs-shell" onClick={() => setShowMoreTones(false)}>
      {/* Icon Rail */}
      <div className="cs-rail" onClick={e => e.stopPropagation()}>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`cs-rail-btn${activeNav === item.id ? ' active' : ''}`}
            data-tip={item.label}
            onClick={() => setActiveNav(item.id)}
          >
            {item.icon}
          </button>
        ))}
        <div className="cs-rail-spacer" />
        <div className="cs-rail-avatar">{initials}</div>
      </div>

      {/* Type Panel — only in generate mode */}
      {activeNav === 'generate' && (
        <ContentTypePanel selectedType={selectedType} onSelect={handleTypeSelect} />
      )}

      {/* Main Workspace */}
      <div className="cs-workspace">
        {renderMainContent()}
      </div>

      {/* History Panel — only in generate mode */}
      {activeNav === 'generate' && (
        <div className="cs-history-panel">
          <div className="cs-history-header">History</div>
          <div className="cs-history-list">
            {history.length === 0 ? (
              <div className="cs-history-empty">No generations yet</div>
            ) : history.map(item => (
              <div
                key={item.id}
                className={`cs-history-item${item.id === generationId ? ' active' : ''}`}
                onClick={() => handleHistorySelect(item)}
              >
                <div className="cs-history-type">{item.contentType}</div>
                <div className="cs-history-preview">{item.output}</div>
                <div className="cs-history-time">{formatTime(item.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -15
```

Expected: `✓ built in` — fix any import errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ContentStudio.jsx && git commit -m "feat: add ContentStudio main shell — 3-panel Focus Mode layout"
```

---

## Task 8: StudioAnalytics

**Files:**
- Create: `src/components/StudioAnalytics.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState, useEffect } from 'react';
import { BarChart2, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudioStats, getPerformanceLogs, logPerformance, getGenerations } from '../services/contentStudioService';

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok'];

export default function StudioAnalytics({ userEmail }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [tab, setTab] = useState('usage');
  const [logForm, setLogForm] = useState({ generationId: '', platform: 'Instagram', reach: '', likes: '', comments: '', shares: '', clicks: '', conversions: '' });
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    getStudioStats(userEmail).then(setStats).catch(() => {});
    getPerformanceLogs(userEmail).then(setLogs).catch(() => {});
    getGenerations(userEmail, 20).then(setGenerations).catch(() => {});
  }, [userEmail]);

  const maxTypeCount = stats?.typeCounts?.[0]?.[1] || 1;
  const maxDailyCount = Math.max(...(stats?.daily?.map(d => d.count) || [1]), 1);

  const handleLog = async () => {
    if (!logForm.reach || !logForm.likes) { toast.error('Reach and likes are required'); return; }
    setLogging(true);
    try {
      const result = await logPerformance({
        generationId: logForm.generationId || 'manual',
        userEmail,
        platform: logForm.platform,
        contentType: generations.find(g => g.id === logForm.generationId)?.contentType || 'Unknown',
        tone: generations.find(g => g.id === logForm.generationId)?.tone || 'Unknown',
        reach: parseInt(logForm.reach) || 0,
        likes: parseInt(logForm.likes) || 0,
        comments: parseInt(logForm.comments) || 0,
        shares: parseInt(logForm.shares) || 0,
        clicks: parseInt(logForm.clicks) || null,
        conversions: parseInt(logForm.conversions) || null,
      });
      toast.success(`Logged! Performance score: ${result.score}/100`);
      getPerformanceLogs(userEmail).then(setLogs);
      setLogForm({ generationId: '', platform: 'Instagram', reach: '', likes: '', comments: '', shares: '', clicks: '', conversions: '' });
    } catch {
      toast.error('Failed to log performance');
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="cs-panel-view">
      <div className="cs-panel-header">
        <BarChart2 size={15} />
        Analytics
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {['usage', 'performance'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '3px 10px', borderRadius: 6, border: '1px solid',
              borderColor: tab === t ? '#9333EA' : '#2A2A2A',
              background: tab === t ? 'rgba(147,51,234,0.15)' : 'transparent',
              color: tab === t ? '#C084FC' : '#52525B',
              fontSize: '0.72rem', cursor: 'pointer',
            }}>
              {t === 'usage' ? 'Studio Usage' : 'Post Performance'}
            </button>
          ))}
        </div>
      </div>

      <div className="cs-panel-body">
        {tab === 'usage' && stats && (
          <>
            <div className="cs-stat-grid">
              <div className="cs-stat-card">
                <div className="cs-stat-label">This Month</div>
                <div className="cs-stat-value">{stats.totalThisMonth}</div>
                {stats.delta !== null && (
                  <div className={`cs-stat-delta ${stats.delta >= 0 ? 'up' : 'down'}`}>
                    {stats.delta >= 0 ? '+' : ''}{stats.delta}% vs last month
                  </div>
                )}
              </div>
              <div className="cs-stat-card">
                <div className="cs-stat-label">Top Type</div>
                <div className="cs-stat-value" style={{ fontSize: '0.9rem', marginTop: 4 }}>{stats.topType || '—'}</div>
              </div>
              <div className="cs-stat-card">
                <div className="cs-stat-label">Top Tone</div>
                <div className="cs-stat-value" style={{ fontSize: '0.9rem', marginTop: 4 }}>{stats.topTone || '—'}</div>
              </div>
              <div className="cs-stat-card">
                <div className="cs-stat-label">Last Month</div>
                <div className="cs-stat-value">{stats.totalLastMonth}</div>
              </div>
            </div>

            <div className="cs-section-title">7-Day Volume</div>
            <div className="cs-sparkline" style={{ marginBottom: 20 }}>
              {stats.daily?.map(({ date, count }) => (
                <div key={date} className="cs-spark-bar" style={{ height: `${Math.max(4, (count / maxDailyCount) * 100)}%` }} title={`${date}: ${count}`} />
              ))}
            </div>

            {stats.typeCounts?.length > 0 && (
              <>
                <div className="cs-section-title">Content Types This Month</div>
                {stats.typeCounts.map(([type, count]) => (
                  <div key={type} className="cs-bar-row">
                    <div className="cs-bar-label">{type}</div>
                    <div className="cs-bar-track">
                      <div className="cs-bar-fill" style={{ width: `${(count / maxTypeCount) * 100}%` }} />
                    </div>
                    <div className="cs-bar-count">{count}</div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'performance' && (
          <>
            <div className="cs-perf-form">
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#A1A1AA', marginBottom: 12 }}>Log Post Performance</div>
              <div style={{ marginBottom: 10 }}>
                <div className="cs-form-label">Content Piece (optional)</div>
                <select className="cs-form-input" value={logForm.generationId} onChange={e => setLogForm(f => ({ ...f, generationId: e.target.value }))}>
                  <option value="">— Select a generation —</option>
                  {generations.map(g => (
                    <option key={g.id} value={g.id}>{g.contentType}: {g.output?.slice(0, 40)}…</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div className="cs-form-label">Platform</div>
                <select className="cs-form-input" value={logForm.platform} onChange={e => setLogForm(f => ({ ...f, platform: e.target.value }))}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="cs-perf-grid">
                {['reach', 'likes', 'comments', 'shares', 'clicks', 'conversions'].map(field => (
                  <div key={field}>
                    <div className="cs-form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</div>
                    <input className="cs-form-input" type="number" min="0" value={logForm[field]} onChange={e => setLogForm(f => ({ ...f, [field]: e.target.value }))} placeholder="0" />
                  </div>
                ))}
              </div>
              <button className="cs-save-btn" onClick={handleLog} disabled={logging} style={{ width: '100%' }}>
                <Plus size={14} style={{ marginRight: 6 }} />
                {logging ? 'Logging…' : 'Log Performance'}
              </button>
            </div>

            {logs.length > 0 && (
              <>
                <div className="cs-section-title">Performance Log</div>
                {logs.map(log => (
                  <div key={log.id} style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#A1A1AA' }}>{log.platform} — {log.contentType}</span>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(147,51,234,0.15)', color: '#C084FC', borderRadius: 4, padding: '2px 8px' }}>
                        {log.score}/100
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: '#52525B' }}>
                      <span>Reach: {log.reach?.toLocaleString()}</span>
                      <span>Likes: {log.likes}</span>
                      <span>ER: {log.engagementRate}%</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/StudioAnalytics.jsx && git commit -m "feat: add StudioAnalytics — usage stats and manual performance tracker"
```

---

## Task 9: ContentCalendar

**Files:**
- Create: `src/components/ContentCalendar.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleGeneration } from '../services/contentStudioService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getCategoryClass(category) {
  const c = (category || '').toLowerCase();
  if (c === 'social') return 'social';
  if (c === 'email') return 'email';
  if (c === 'ads') return 'ads';
  if (c === 'long form') return 'longform';
  return 'social';
}

export default function ContentCalendar({ userEmail, history }) {
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState(null);

  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const scheduled = useMemo(() => {
    const map = {};
    (history || []).forEach(item => {
      if (item.scheduledDate) {
        const d = item.scheduledDate.toDate ? item.scheduledDate.toDate() : new Date(item.scheduledDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        if (map[key].length < 3) map[key].push(item);
      }
    });
    return map;
  }, [history]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  const prevMonth = () => setDate(new Date(year, month - 1, 1));
  const nextMonth = () => setDate(new Date(year, month + 1, 1));

  const monthName = date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

  return (
    <div className="cs-panel-view">
      <div className="cs-panel-header">
        <Calendar size={15} />
        Content Calendar
      </div>
      <div className="cs-panel-body">
        <div className="cs-calendar-nav">
          <button className="cs-nav-btn" onClick={prevMonth}><ChevronLeft size={14} /></button>
          <h3>{monthName}</h3>
          <button className="cs-nav-btn" onClick={nextMonth}><ChevronRight size={14} /></button>
        </div>

        <div className="cs-calendar-grid">
          {DAYS.map(d => (
            <div key={d} className="cs-cal-header-cell">{d}</div>
          ))}
          {cells.map((cell, idx) => {
            if (!cell.day) return <div key={idx} className="cs-cal-cell other-month" />;
            const isToday = today.getDate() === cell.day && today.getMonth() === month && today.getFullYear() === year;
            const key = `${year}-${month}-${cell.day}`;
            const chips = scheduled[key] || [];
            return (
              <div key={idx} className={`cs-cal-cell${isToday ? ' today' : ''}`} onClick={() => setSelected({ day: cell.day, key })}>
                <div className={`cs-cal-day-num${isToday ? ' today' : ''}`}>{cell.day}</div>
                {chips.map(item => (
                  <div key={item.id} className={`cs-cal-chip ${getCategoryClass(item.category)}`} title={item.output?.slice(0, 80)}>
                    {item.contentType}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {history?.filter(h => !h.scheduledDate).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="cs-section-title">Unscheduled — drag to a day</div>
            {history.filter(h => !h.scheduledDate).slice(0, 10).map(item => (
              <div key={item.id} style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: 6, padding: '8px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9333EA', textTransform: 'uppercase', marginBottom: 2 }}>{item.contentType}</div>
                  <div style={{ fontSize: '0.72rem', color: '#52525B' }}>{item.output?.slice(0, 50)}…</div>
                </div>
                <button onClick={async () => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  try {
                    await scheduleGeneration(item.id, d);
                    toast.success('Scheduled for tomorrow');
                  } catch { toast.error('Schedule failed'); }
                }} style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: 5, border: '1px solid #2A2A2A', background: 'transparent', color: '#71717A', cursor: 'pointer' }}>
                  Tomorrow
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ContentCalendar.jsx && git commit -m "feat: add ContentCalendar with monthly grid and scheduling"
```

---

## Task 10: BulkGenerator

**Files:**
- Create: `src/components/BulkGenerator.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState } from 'react';
import { Package, Sparkles, Check, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateContent } from '../services/contentStudioService';

const BULK_PACK = [
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 1' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 2' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 3' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 4' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 5' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 6' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 7' },
  { contentType: 'LinkedIn Post', category: 'Social', label: 'LinkedIn Post 1' },
  { contentType: 'LinkedIn Post', category: 'Social', label: 'LinkedIn Post 2' },
  { contentType: 'LinkedIn Post', category: 'Social', label: 'LinkedIn Post 3' },
  { contentType: 'Cold Outreach', category: 'Email', label: 'Cold Outreach Email 1' },
  { contentType: 'Cold Outreach', category: 'Email', label: 'Cold Outreach Email 2' },
  { contentType: 'Blog Outline', category: 'Long Form', label: 'Blog Outline' },
];

export default function BulkGenerator({ userEmail, brandVoice, onComplete }) {
  const [brief, setBrief] = useState('');
  const [items, setItems] = useState(BULK_PACK.map(p => ({ ...p, status: 'pending', output: null })));
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const updateItem = (idx, patch) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));

  const run = async () => {
    if (!brief.trim()) { toast.error('Add a brief for the pack'); return; }
    setRunning(true);
    setDone(false);
    setItems(BULK_PACK.map(p => ({ ...p, status: 'pending', output: null })));

    for (let i = 0; i < BULK_PACK.length; i++) {
      const item = BULK_PACK[i];
      updateItem(i, { status: 'active' });
      try {
        const result = await generateContent({
          contentType: item.contentType,
          category: item.category,
          tone: 'Professional',
          brief,
          businessContext: brandVoice?.businessName || '',
          targetAudience: brandVoice?.targetAudience || '',
          brandVoice,
          userEmail,
        });
        updateItem(i, { status: 'done', output: result.output });
      } catch (err) {
        updateItem(i, { status: 'error' });
        if (err.message?.includes('Rate limit')) {
          toast.error('Rate limit reached — resuming in 60 seconds');
          await new Promise(r => setTimeout(r, 60000));
          i--;
        }
      }
    }

    setRunning(false);
    setDone(true);
    onComplete?.();
    toast.success('Bulk pack complete! All 13 pieces saved to history.');
  };

  const completedCount = items.filter(i => i.status === 'done').length;

  return (
    <div className="cs-panel-view">
      <div className="cs-panel-header">
        <Package size={15} />
        Bulk Generation Pack
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#52525B' }}>
          {running ? `${completedCount} of ${BULK_PACK.length}` : `${BULK_PACK.length} pieces`}
        </span>
      </div>
      <div className="cs-panel-body">
        {!running && !done && (
          <div style={{ marginBottom: 16 }}>
            <div className="cs-form-label" style={{ marginBottom: 6 }}>What is your business / campaign about?</div>
            <textarea className="cs-form-textarea" value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe your business, current campaign, or key message. All 13 pieces will be tailored to this." style={{ minHeight: 80 }} />
            <button className="cs-generate-btn" style={{ marginTop: 12 }} onClick={run}>
              <Package size={15} />
              Generate All 13 Pieces
            </button>
          </div>
        )}

        {running && (
          <div className="cs-progress-bar" style={{ marginBottom: 16 }}>
            <div className="cs-progress-fill" style={{ width: `${(completedCount / BULK_PACK.length) * 100}%` }} />
          </div>
        )}

        {items.map((item, idx) => (
          <div key={idx} className="cs-bulk-item">
            <div className={`cs-bulk-status ${item.status}`}>
              {item.status === 'done' && <Check size={10} />}
              {item.status === 'active' && <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} />}
              {item.status === 'error' && <AlertCircle size={10} />}
              {item.status === 'pending' && idx + 1}
            </div>
            <div className="cs-bulk-label">{item.label}</div>
            {item.status === 'done' && (
              <span style={{ fontSize: '0.65rem', color: '#4ADE80' }}>Saved</span>
            )}
          </div>
        ))}

        {done && (
          <button className="cs-generate-btn" style={{ marginTop: 16 }} onClick={() => { setDone(false); setItems(BULK_PACK.map(p => ({ ...p, status: 'pending', output: null }))); setBrief(''); }}>
            <Package size={15} />
            Generate Another Pack
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/BulkGenerator.jsx && git commit -m "feat: add BulkGenerator — sequential 13-piece pack with progress tracking"
```

---

## Task 11: RepurposePanel

**Files:**
- Create: `src/components/RepurposePanel.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateContent, getGenerations } from '../services/contentStudioService';

const REPURPOSE_TARGETS = {
  Social: ['LinkedIn Post', 'Twitter / X Thread', 'Instagram Caption', 'Facebook Post'],
  Email: ['Cold Outreach', 'Newsletter'],
  Ads: ['Facebook / Instagram Ad', 'Google RSA'],
};

function getTargetsFor(contentType) {
  const allTargets = Object.values(REPURPOSE_TARGETS).flat();
  return allTargets.filter(t => t !== contentType).slice(0, 5);
}

export default function RepurposePanel({ userEmail, brandVoice, onComplete }) {
  const [generations, setGenerations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [source, setSource] = useState(null);
  const [variants, setVariants] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    getGenerations(userEmail, 30).then(setGenerations).catch(() => {});
  }, [userEmail]);

  const selectedGen = generations.find(g => g.id === selectedId);

  const repurpose = async () => {
    if (!selectedGen) { toast.error('Select a piece to repurpose'); return; }
    setRunning(true);
    setVariants([]);
    setSource(selectedGen);
    const targets = getTargetsFor(selectedGen.contentType);

    for (const target of targets) {
      try {
        const result = await generateContent({
          contentType: target,
          category: Object.keys(REPURPOSE_TARGETS).find(cat => REPURPOSE_TARGETS[cat].includes(target)) || 'Social',
          tone: selectedGen.tone || 'Professional',
          brief: `Repurpose the following content for ${target}:\n\n${selectedGen.output}`,
          businessContext: brandVoice?.businessName || '',
          targetAudience: brandVoice?.targetAudience || '',
          brandVoice,
          userEmail,
        });
        setVariants(v => [...v, { platform: target, output: result.output, id: result.generationId }]);
      } catch {
        setVariants(v => [...v, { platform: target, output: null, error: true }]);
      }
    }

    setRunning(false);
    onComplete?.();
    toast.success('Repurpose complete — all variants saved to history');
  };

  return (
    <div className="cs-panel-view">
      <div className="cs-panel-header">
        <RefreshCw size={15} />
        Repurpose Content
      </div>
      <div className="cs-panel-body">
        <div style={{ marginBottom: 16 }}>
          <div className="cs-form-label">Select a piece from history</div>
          <select className="cs-form-input" value={selectedId} onChange={e => { setSelectedId(e.target.value); setVariants([]); setSource(null); }}>
            <option value="">— Choose content to repurpose —</option>
            {generations.map(g => (
              <option key={g.id} value={g.id}>{g.contentType}: {g.output?.slice(0, 50)}…</option>
            ))}
          </select>
        </div>

        {selectedGen && (
          <div className="cs-repurpose-source">
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9333EA', textTransform: 'uppercase', marginBottom: 6 }}>
              {selectedGen.contentType}
            </div>
            {selectedGen.output?.slice(0, 200)}{selectedGen.output?.length > 200 ? '…' : ''}
          </div>
        )}

        {selectedGen && !running && variants.length === 0 && (
          <button className="cs-generate-btn" onClick={repurpose}>
            <RefreshCw size={15} />
            Repurpose to {getTargetsFor(selectedGen.contentType).length} Platforms
          </button>
        )}

        {running && (
          <div style={{ color: '#52525B', fontSize: '0.8rem', marginBottom: 12 }}>
            Generating variants… {variants.length} of {selectedGen ? getTargetsFor(selectedGen.contentType).length : 0} done
          </div>
        )}

        {variants.map((v, idx) => (
          <div key={idx} className="cs-repurpose-variant">
            <div className="cs-repurpose-platform">{v.platform}</div>
            {v.error ? (
              <div style={{ color: '#EF4444', fontSize: '0.75rem' }}>Generation failed for this platform</div>
            ) : (
              <>
                <div className="cs-repurpose-text">{v.output}</div>
                <button className="cs-share-btn" style={{ marginTop: 8 }} onClick={() => { navigator.clipboard.writeText(v.output); toast.success('Copied'); }}>
                  <Copy size={10} /> Copy
                </button>
              </>
            )}
          </div>
        ))}

        {!running && variants.length > 0 && (
          <button className="cs-generate-btn" style={{ marginTop: 16 }} onClick={() => { setVariants([]); setSource(null); setSelectedId(''); }}>
            Repurpose Another Piece
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RepurposePanel.jsx && git commit -m "feat: add RepurposePanel — cross-platform content repurposing"
```

---

## Task 12: MarketingGenerator Mode Toggle

**Files:**
- Modify: `src/pages/MarketingGenerator.jsx`

- [ ] **Step 1: Add mode toggle and ContentStudio import**

Add imports at the top of `src/pages/MarketingGenerator.jsx` after the existing imports:

```jsx
import ContentStudio from './ContentStudio';
```

- [ ] **Step 2: Add mode state and toggle UI**

Add inside the `MarketingGenerator` component, after the existing state declarations:

```jsx
const [mode, setMode] = useState('studio');
```

- [ ] **Step 3: Wrap existing return with mode toggle**

Replace the entire `return (...)` of `MarketingGenerator` with:

```jsx
  return (
    <>
      <div className="mg-mode-toggle">
        <button className={`mg-mode-btn${mode === 'studio' ? ' active' : ''}`} onClick={() => setMode('studio')}>
          Content Studio
        </button>
        <button className={`mg-mode-btn${mode === 'strategy' ? ' active' : ''}`} onClick={() => setMode('strategy')}>
          Strategy Wizard
        </button>
      </div>

      {mode === 'studio' ? (
        <ContentStudio />
      ) : (
        <div className="marketing-generator-page">
          {/* existing strategy wizard JSX — unchanged */}
          <div className="mg-header">
            <h1>Marketing Strategy</h1>
            <p>Generate a full AI-powered marketing strategy tailored to your business.</p>
          </div>

          {currentStep === 'form' && (
            <MarketingForm onSubmit={handleFormSubmit} />
          )}

          {currentStep === 'payment' && (
            <PaymentGateway
              onSuccess={handlePaymentSuccess}
              onBack={() => setCurrentStep('form')}
              paymentMetadata={getEftPaymentMetadata(formData)}
            />
          )}

          {currentStep === 'generating' && (
            <div className="mg-generating">
              <div className="mg-spinner" />
              <p>Generating your strategy…</p>
              {lastError && <p style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: 8 }}>{lastError}</p>}
            </div>
          )}

          {currentStep === 'results' && strategyResult && (
            <StrategyDashboard
              strategy={strategyResult}
              strategyId={strategyId}
              onReset={() => { setCurrentStep('form'); setStrategyResult(null); setStrategyId(null); setFormData(null); setUploadedFileUrls([]); }}
            />
          )}
        </div>
      )}
    </>
  );
```

- [ ] **Step 4: Read the actual current return statement before editing**

Read `src/pages/MarketingGenerator.jsx` lines 60–end to see the exact current return, then apply the changes precisely using the Edit tool. Do not guess at the existing JSX structure.

- [ ] **Step 5: Build check**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -15
```

Fix any import or JSX errors. The build must pass before committing.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MarketingGenerator.jsx && git commit -m "feat: add Content Studio / Strategy Wizard mode toggle to marketing generator"
```

---

## Task 13: index.html Meta Tag Fixes

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Fix og:image and twitter:image to use absolute URL**

In `index.html`, change:

```html
    <meta property="og:image" content="/og-image.png" />
```

to:

```html
    <meta property="og:image" content="https://www.driftstudio.co.za/og-image.png" />
```

And change:

```html
    <meta property="twitter:image" content="/og-image.png" />
```

to:

```html
    <meta property="twitter:image" content="https://www.driftstudio.co.za/og-image.png" />
```

- [ ] **Step 2: Commit**

```bash
git add index.html && git commit -m "fix: use absolute URLs for og:image and twitter:image meta tags"
```

---

## Task 14: Deploy

- [ ] **Step 1: Final build**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && npm run build 2>&1 | tail -20
```

Expected: `✓ built in` with no errors. Chunk size warnings are acceptable.

- [ ] **Step 2: Deploy hosting**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && firebase deploy --only hosting
```

Expected: `✔ Deploy complete!` with live URL printed.

- [ ] **Step 3: Smoke test**

Open `https://www.driftstudio.co.za/marketing-generator` in a browser and verify:
- Mode toggle appears top-right
- Content Studio loads by default (not strategy wizard)
- Icon rail renders all 7 icons
- Content type panel is searchable
- Selecting a type updates the breadcrumb
- Tone pills are clickable
- Brief field accepts input
- Generate button is present (generation requires deployed function)

- [ ] **Step 4: Final commit**

```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media" && git add -A && git status
```

If there are any unstaged changes from the build, commit them:

```bash
git commit -m "chore: final build artifacts and deploy"
```

---

## After Plan A: Plan B

Plan B covers all 9 automation Cloud Functions (Tier 1 + Tier 2). Build Plan B after Plan A is deployed and the Content Studio is generating real data in Firestore. The Plan B doc will be created as `docs/superpowers/plans/2026-05-18-content-studio-automations.md`.

Functions in scope for Plan B:
- `deliverWeeklyContentPack` (Mon 8am SAST, SendGrid)
- `sendCalendarGapNudge` (Sun 7pm SAST)
- `generateMonthlyReport` (1st of month 7am SAST, jsPDF + SendGrid)
- `triggerAutoRepurpose` (Firestore onWrite)
- `deliverWeeklyTrendBrief` (Fri 12pm SAST)
- `recycleEvergreenContent` (every 90 days)
- `postToSocialPlatform` (HTTP POST internal)
- `sendWhatsAppBroadcast` (HTTP POST internal)
- `triggerClientApproval` (HTTP POST + Firestore onWrite)
