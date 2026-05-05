# Design: Brand DNA, Image Generation & Guides
**Date:** 2026-05-05
**Status:** Approved — ready for implementation

---

## Overview

Three coordinated features that together make Drift Studio the most complete AI-powered social media platform for South African SMBs — differentiating from both global tools (Hootsuite, Buffer, Sprout Social) and local agencies.

**Build order:**
1. Guides & Help Centre (fastest, independent)
2. Brand DNA (Firestore layer + prompt injection)
3. Image Generation (hooks into pipeline after Brand DNA)

Brand DNA and Image Generation are built as one "AI Pipeline Upgrade" because Brand DNA enriches the prompt context that Image Generation also uses.

---

## Feature 1 — Guides & Help Centre

### Public Page `/guides`

New page added to the site and navbar (between "Automation" and "Pricing").

**Architecture:** 100% static React — hardcoded `guides` data array, no Firestore, no API calls. Single page with inline-expanding cards.

**Navbar:** Add "Guides" link between "Automation" and "Pricing".

**Layout:** Card grid — one card per guide. Each card shows icon, title, short description. Clicking expands inline to show numbered steps. No sub-page routing.

**Seven guides:**

1. **How to submit a content brief**
   - Navigate to Submit Brief
   - Fill in business name, industry, target audience, campaign goal, platforms
   - Upload any brand assets (optional)
   - Submit — you'll receive a confirmation email and your calendar within minutes

2. **How to review and approve your calendar**
   - Open the review link emailed to you
   - Read through each post — caption, visual direction, hashtags, scheduled time
   - If happy: click "Approve All & Schedule" — posts queue immediately
   - Your calendar is saved to your Google Drive folder automatically

3. **How to request revisions**
   - On the review page, click "Request Changes"
   - Type your feedback in plain English (e.g. "use a more professional tone, fewer emojis")
   - Submit — the AI re-generates your calendar using your feedback within minutes
   - You'll receive a new review link by email (up to 3 revision rounds per calendar)

4. **How to use the Price Intelligence tool**
   - Navigate to Price Intelligence
   - Enter your business type, location, and up to 3 competitor names
   - Pay the one-off R149 fee
   - Receive a full competitive pricing report with positioning recommendations

5. **How to read your Client Portal dashboard**
   - Log in at /client-portal with your email and password
   - Dashboard tab: see active campaigns, posts queued, and posts published
   - Calendars tab: view all your content calendars and their approval status
   - Upcoming Posts tab: preview the next 5 posts with captions, platforms, and scheduled times

6. **How to use the Marketing Strategy Generator**
   - Navigate to Strategy Generator
   - Fill in your business details, target audience, and current marketing channels
   - Pay the one-off R99 fee (or use a promo code)
   - Receive a full AI-generated marketing strategy with content concepts and ready-to-post captions

7. **How to connect your social media accounts**
   - Instagram: Go to Meta Business Suite → Settings → Instagram API → Generate access token → paste in Drift Studio account settings
   - Facebook: Go to Meta Business Suite → Settings → Pages → Generate page access token → paste in Drift Studio account settings
   - TikTok: Go to TikTok for Business → Developer Portal → Create app → copy API key → paste in Drift Studio account settings
   - LinkedIn: Go to LinkedIn Developer Portal → My Apps → Create app → copy client ID and secret → paste in Drift Studio account settings
   - X (Twitter): Go to developer.x.com → Projects & Apps → Keys and Tokens → copy Bearer Token → paste in Drift Studio account settings
   - All keys are stored encrypted. Drift Studio never stores your personal login credentials.

### In-Portal Help Panel

A `?` floating button in the bottom-right of the Client Portal. Clicking it slides up a compact help panel contextual to the current tab:

- **Dashboard tab:** Shows "How to read your dashboard" guide
- **Calendars tab:** Shows "How to review and approve your calendar" guide
- **Upcoming Posts tab:** Shows "What happens after approval" explanation

Panel is a collapsible overlay — does not navigate away from the portal.

---

## Feature 2 — Brand DNA

### What It Does

A living brand profile per client that accumulates silently from how they interact with their content calendars. No extra client effort — it learns from approvals and revision feedback automatically.

### Firestore Data Model

Collection: `brandProfiles`
Document ID: `{clientId}`

```
{
  clientId: string,
  brandName: string,
  toneSignals: string[],          // e.g. ["professional", "warm", "concise"]
  avoidSignals: string[],         // e.g. ["emojis", "slang", "hard sell"]
  preferredTopics: string[],      // e.g. ["behind the scenes", "product tips"]
  avoidTopics: string[],          // e.g. ["competitor mentions", "pricing"]
  platformNotes: {
    Instagram: string,
    Facebook: string,
    TikTok: string,
    LinkedIn: string,
    "Twitter / X": string
  },
  rawFeedbackHistory: string[],   // last 10 revision feedbacks (raw text, capped)
  approvedWithoutRevision: number,
  totalRevisions: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Learning Triggers

**Trigger 1 — On revision requested** (`onCalendarRevisionRequested.js`)

Before re-generating the calendar:
1. Make a fast Gemini call to parse `clientFeedback` into structured signals
2. Merge extracted signals into `brandProfiles/{clientId}` (create if doesn't exist)
3. Append raw feedback to `rawFeedbackHistory` (cap at 10, drop oldest)
4. Increment `totalRevisions`

Signal extraction prompt:
```
Parse this client feedback into brand voice signals.
Feedback: "[clientFeedback]"

Return JSON only:
{
  "toneSignals": [],
  "avoidSignals": [],
  "preferredTopics": [],
  "avoidTopics": [],
  "platformNotes": {}
}
```

**Trigger 2 — On calendar approved** (`approveContent.js`)

After successful approval:
1. Fetch or create `brandProfiles/{clientId}`
2. Increment `approvedWithoutRevision`
3. Update `updatedAt`

### Prompt Injection

In `aiService.js` → `generateContentCalendar()`:

1. Fetch `brandProfiles/{clientId}` (if clientId provided)
2. If profile exists and has signals, prepend to prompt:

```
BRAND DNA (learned from [N] approved calendars):
Tone: [toneSignals joined]
Avoid: [avoidSignals joined]
Preferred topics: [preferredTopics joined]
Avoid topics: [avoidTopics joined]
Past client feedback (most recent): "[rawFeedbackHistory last 3]"
```

3. If no profile exists → generation works exactly as today (safe for new clients)

### Key Constraints

- Profile never resets between calendars — signals accumulate permanently
- `rawFeedbackHistory` capped at 10 to keep prompt injection lean
- Signal extraction failure is non-blocking — calendar regeneration still proceeds
- New clients with no profile see zero change to existing behaviour

---

## Feature 3 — Image Generation

### What It Does

After Gemini generates the content calendar, Imagen 3 (via Vertex AI — same provider already in use) generates a social-ready image for every post using the `visualDescription` as the base prompt, enhanced with Brand DNA style signals if available.

### Pipeline Flow

```
Brief submitted
  → Gemini generates calendar text (existing)
  → [NEW] Fetch Brand DNA profile for client
  → [NEW] For each post: build enhanced image prompt
  → [NEW] Call Imagen 3 in parallel batches of 5
  → [NEW] Upload images to Firebase Storage
  → [NEW] Save imageUrl on each post in Firestore calendar document
  → Send approval email with review link (existing)
  → Approval page shows image + caption per post (updated)
  → Client portal shows image thumbnails (updated)
```

### Image Prompt Construction

Per post:
```
Social media image for [platform].
[visualDescription from Gemini]
[If Brand DNA available]: Style: [toneSignals], [avoidSignals as negatives].
High quality, vibrant, professional, suitable for [platform].
No text overlays. No logos. No watermarks.
```

### Storage Path

`clients/{clientId}/calendars/{calendarId}/day-{N}.jpg`

`imageUrl` field added to each post object in the `contentCalendar` Firestore document.

### Parallelisation & Resilience

- Images generated in parallel batches of 5 (avoids Vertex AI rate limits)
- If a single image fails: post continues with `imageUrl: null` — never blocks the calendar
- If entire image generation step fails: calendar sends as text-only (existing behaviour preserved)
- Images are JPEG, optimised for web before upload

### Where Images Appear

1. **Approval review page** (`approveContent.js` HTML): Each post card shows the generated image above the caption. Falls back gracefully to visual description text if `imageUrl` is null.

2. **Client Portal** (`ClientPortal.jsx` → `PostCard` component): Image thumbnail displayed above caption in each post card. Null-safe — no image shown if generation failed.

### Cost Per Client Per Month

| Plan | Posts | Est. cost (Imagen 3) |
|------|-------|---------------------|
| Ignite | 12 | ~R11/month |
| Momentum | 30 | ~R27/month |
| Apex | 60 | ~R54/month |

Absorbed comfortably within plan margins at all tiers.

---

## Files Changed

### New files
- `src/pages/Guides.jsx` — public guides page
- `functions/contentPipeline/services/brandDnaService.js` — signal extraction + profile read/write
- `functions/contentPipeline/services/imageGenService.js` — Imagen 3 calls + Storage upload

### Modified files
- `src/App.jsx` — add `/guides` route
- `src/components/Navbar.jsx` — add Guides nav link
- `src/pages/ClientPortal.jsx` — add contextual help panel + image thumbnails in PostCard
- `functions/contentPipeline/services/aiService.js` — inject Brand DNA into prompt, orchestrate image gen
- `functions/contentPipeline/services/promptTemplates.js` — add brand DNA prefix to calendar prompt, add signal extraction prompt
- `functions/contentPipeline/triggers/onCalendarRevisionRequested.js` — call brandDnaService on revision
- `functions/contentPipeline/endpoints/approveContent.js` — call brandDnaService on approval, show images in HTML review page
- `functions/contentPipeline/triggers/onContentBriefSubmitted.js` — pass clientId through to generation

### Firestore
- New collection: `brandProfiles/{clientId}`
- Updated collection: `contentCalendar` — each post object gains optional `imageUrl: string`

### Firebase Storage
- New path: `clients/{clientId}/calendars/{calendarId}/day-{N}.jpg`
