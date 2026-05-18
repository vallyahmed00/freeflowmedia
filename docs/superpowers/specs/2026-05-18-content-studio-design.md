# Content Studio — Design Spec
**Date:** 2026-05-18
**Project:** Drift Studio — driftstudio.co.za
**Route:** `/marketing-generator` (MarketingGenerator.jsx)
**Status:** Approved for implementation

---

## Overview

Transform `/marketing-generator` from a 4-step strategy wizard into a dual-mode **Content Studio** — a full-screen, professional content production tool for Drift Studio clients. The existing strategy wizard is preserved unchanged. The new Content Studio is the permanent tool clients use after their initial strategy is generated.

AI engine: **Gemini 2.0 Flash** via existing `getAI()` helper and `GEMINI_API_KEY` secret. Zero new secrets required.

---

## Architecture

### Dual-Mode Layout

The page has a mode toggle in the top bar:

- **Strategy mode** — existing 4-step wizard (Brief → Payment → Generating → Results). Unchanged.
- **Content Studio mode** — new Focus Mode 3-panel layout. Default view for returning clients.

### New Cloud Functions (added to `functions/index.js`)

| Function | Trigger | Purpose |
|---|---|---|
| `contentGeneratorProxy` | HTTP POST | Gemini 2.0 Flash generates content by type + tone. Logs to `content_generations`. Rate-limited 20 req/user/hour. |
| `deliverWeeklyContentPack` | Scheduled Mon 8am SAST | Generates full week pack per client → SendGrid email delivery |
| `sendCalendarGapNudge` | Scheduled Sun 7pm SAST | Checks calendar for empty days next week → WhatsApp/Telegram alert |
| `generateMonthlyReport` | Scheduled 1st of month 7am SAST | Builds PDF analytics report → SendGrid delivery |
| `triggerAutoRepurpose` | Firestore onWrite (`content_generations`) | When status set to `approved` → generates all platform variants via Claude |
| `deliverWeeklyTrendBrief` | Scheduled Fri 12pm SAST | Gemini scans niche trends → 5 content ideas email/WhatsApp to client |
| `recycleEvergreenContent` | Scheduled every 90 days | Queries top-scored content_performance docs → Claude rewrites with fresh angle |
| `postToSocialPlatform` | HTTP POST | Queued direct posting to Instagram, Facebook, LinkedIn, Twitter/X |
| `sendWhatsAppBroadcast` | HTTP POST | Sends content packs and reports via WhatsApp Business API |
| `triggerClientApproval` | HTTP POST + Firestore onWrite | Sends approval request → watches for client reply → schedules or flags for revision |

### Firestore Collections

**`content_generations`** (new):
```
{
  clientId: string,
  userEmail: string,
  contentType: string,
  category: string,
  tone: string,
  prompt: string,
  output: string,
  charCount: number,
  version: number,           // 1–5
  status: 'draft' | 'approved' | 'scheduled' | 'posted',
  scheduledDate: Timestamp | null,
  platformVariants: { [platform]: string } | null,
  createdAt: Timestamp
}
```

**`content_performance`** (new):
```
{
  generationId: string,      // ref to content_generations doc
  clientId: string,
  platform: string,          // 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'tiktok'
  contentType: string,
  tone: string,
  reach: number,
  likes: number,
  engagementRate: number,    // calculated: (likes + comments + shares) / reach
  clicks: number | null,
  conversions: number | null,
  score: number,             // AI-calculated 0–100
  loggedAt: Timestamp
}
```

**`brandVoiceProfiles`** (new — synced from client localStorage on save):
```
{
  clientId: string,
  userEmail: string,
  businessName: string,
  industry: string,
  targetAudience: string,
  brandWords: string[],
  competitors: string,
  coreServices: string,
  location: string,
  updatedAt: Timestamp
}
```
BrandVoicePanel writes to both `localStorage` (for instant client-side access) and this Firestore collection (so server-side automation functions can inject brand voice into scheduled generation).

**`socialConnections`** (new — Tier 2):
```
{
  clientId: string,
  platform: string,
  accessToken: string,       // encrypted via Firebase Secret Manager reference
  refreshToken: string,
  accountId: string,
  connectedAt: Timestamp,
  lastSyncAt: Timestamp | null
}
```

**`clientApprovals`** (new — Tier 2):
```
{
  generationId: string,
  clientId: string,
  sentTo: string,            // phone or email
  channel: 'whatsapp' | 'email',
  status: 'pending' | 'approved' | 'revision_requested',
  revisionNote: string | null,
  sentAt: Timestamp,
  respondedAt: Timestamp | null
}
```

### Security

- `contentGeneratorProxy` — CORS restricted to `https://driftstudio.co.za` only. Rate limit 20 req/user/hour checked against `content_generations` count in last 60 minutes. All user inputs passed as prompt context only — never executed.
- All platform tokens (Meta, LinkedIn, Twitter, WhatsApp Business) stored as Firebase secrets — never in client bundle.
- `postToSocialPlatform`, `sendWhatsAppBroadcast`, `triggerClientApproval` — called only by other Cloud Functions or scheduled triggers, never directly from the browser. Protected via Firebase Admin SDK caller verification.
- Input validation on all user-facing fields: max lengths enforced server-side.

---

## Content Studio UI — Focus Mode

### Layout (full-screen, no Navbar/Footer)

```
┌──────┬────────────────┬──────────────────────────────────┬───────────────┐
│ Icon │ Content Types  │         Main Workspace            │    History    │
│ Rail │ (searchable)   │  Topbar: breadcrumb + tone pills  │               │
│ 52px │    200px       │  Body: Form (260px) + Output      │    200px      │
│      │                │                (flex-1)           │               │
└──────┴────────────────┴──────────────────────────────────┴───────────────┘
```

### Icon Rail (left, 52px)

Lucide icons, tooltips on hover:

| Icon | Feature |
|---|---|
| Sparkles | Generate (default active) |
| Calendar | Content Calendar |
| Package | Bulk Generation Pack |
| RefreshCw | Repurpose |
| BarChart2 | Analytics |
| Heart | Brand Voice |
| Settings | Settings / Integrations |
| Avatar | User initials (bottom) |

### Content Type Panel (200px)

- Search input at top (filters list live)
- Categories with purple headings, types as left-bordered list items
- Active type has purple left border + subtle background
- 30 types across 5 categories (see Content Types section)

### Main Workspace

**Topbar:**
- Breadcrumb: `Category › Content Type`
- Tone pills (6 visible + "More →" overflow for remaining 5)
- Active tone highlighted purple

**Body — Form side (260px, fixed):**
- Business / Brand field (pre-filled from Brand Voice if set)
- Target Audience field (pre-filled from Brand Voice if set)
- Post Context / Brief textarea (platform-specific placeholder)
- Tone selector (mirrors topbar pills)
- Brand Voice active banner (purple, shows when profile loaded)
- Generate button (gradient, Sparkles icon)

**Body — Output side (flex-1):**
- Output header: label + Regenerate / Edit / Copy buttons
- Content area (editable on click — inline edit mode)
- Character count bar with platform limit (e.g. 287 / 2,200 for Instagram)
- Meta row: char count chip · hashtag count · version indicator (Version 1 of 5)
- Share row: Discord · Telegram · iMessage · Copy · PDF · Add to Calendar

### History Panel (200px, right)

- "History" header + Filter button
- Items: content type label (purple, uppercase) · 2-line preview · timestamp
- Current item highlighted with left purple border
- Dividers between items
- Persists in `content_generations` Firestore — survives page refresh

---

## Content Types (30 total)

### Social (8)
- Instagram Caption
- Instagram Carousel (slide titles + body copy)
- Facebook Post
- LinkedIn Post
- Twitter / X Thread
- TikTok Script
- YouTube Shorts Script
- Pinterest Description

### Email (5)
- Cold Outreach
- Newsletter
- 3-Email Drip Sequence
- Promotional Email
- Re-engagement Email

### Website Copy (6)
- Hero Headline
- About Us
- Service Description
- Testimonial Prompt
- FAQ (5 Q&As)
- Meta Tags (SEO title + description)

### Ads (4)
- Google RSA (15 headlines + 4 descriptions)
- Facebook / Instagram Ad
- LinkedIn Ad
- Retargeting Ad

### Long Form (4)
- Blog Outline
- Full Blog Post
- Press Release
- Case Study

---

## Tone System (11 tones)

**First 6 (visible in pill row):**
Casual · Professional · Bold · Witty · Inspirational · Educational

**Overflow (shown via "More →"):**
Urgent · Storytelling · Luxury · Direct · Empathetic

### Humanizer Rules (injected into every prompt)

- No em dashes
- No "I hope this finds you well" or equivalent opener
- No rule-of-three bullet lists
- No sentence starting with an -ing verb
- Mix sentence lengths: short punchy lines alongside longer flowing ones
- Use contractions throughout (I'm, we've, don't, it's, you're)
- No corporate buzzwords: leverage, synergy, robust, seamlessly, holistic, ecosystem
- Single specific CTA only — never multiple asks
- Reference the client's specific context in line 1

---

## Brand Voice Memory

Stored in `localStorage` key `driftStudio_brandVoice`. Injected into every prompt automatically.

**Fields:**
```json
{
  "businessName": "",
  "industry": "",
  "targetAudience": "",
  "brandWords": ["", "", ""],
  "competitors": "",
  "coreServices": "",
  "location": ""
}
```

Edited via Brand Voice panel (heart icon in left rail). Panel slides open inline — not a modal. Changes persist immediately to localStorage.

---

## Workflow Features

### Content Calendar

- Accessed via Calendar icon in left rail — replaces main workspace area
- Monthly grid view (7-col, 5-row)
- Each cell: day number + up to 3 content chips
- Content chips color-coded by category: purple=Social, blue=Email, green=Ads, orange=Long Form
- Drag generated content from history onto a day to schedule it
- Click a scheduled chip to view/edit the full output
- PDF export of full month (jsPDF — branded Drift Studio header)
- No actual publishing from calendar in v1 — scheduling only

### Bulk Generation Pack

- Accessed via Package icon in left rail
- One click generates: 7 Instagram captions + 3 LinkedIn posts + 2 cold email subjects + 1 blog outline
- Sequential Claude calls with progress bar per item (e.g. "Generating 3 of 13…")
- Each item lands in history on completion
- All 13 items can be dragged to calendar immediately after

### Content Repurposing

- Accessed via RefreshCw icon OR "Repurpose" button on any history item
- Select one piece → "Repurpose this"
- Automatically generates adapted versions for all other relevant platforms
- Example: LinkedIn post → Instagram Caption + Twitter Thread + Email Intro + Google Ad Headline
- All variants saved to history, linked to original via `sourceGenerationId`

### Inline Edit Mode

- Click any output text to enter edit mode
- Edits auto-save to that version in Firestore
- Character count updates live while editing
- Exit edit mode: click outside or press Escape

### Version History

- Up to 5 versions per content type per session
- "Version 2 of 5" indicator in output meta row
- ← → arrows to navigate versions
- Previous versions accessible in history panel

---

## Analytics (A + B)

### Analytics A — Studio Analytics

Built entirely from `content_generations` Firestore collection. No external APIs.

**Stats shown:**
- Total pieces generated (this month vs last month, % delta)
- Most used content type (this month)
- Most used tone
- Bar chart: top 8 content types by volume
- Tone distribution (pie/bar)
- Daily generation volume (7-day sparkline)
- Weekly comparison

### Analytics B — Manual Performance Tracker

Clients log real post metrics against generated content.

**Log entry fields:** platform · post title/preview · reach · likes · comments · shares · clicks (optional) · conversions (optional)

**AI scoring:** After logging, `contentGeneratorProxy` calculates a 0–100 performance score using: engagement rate weighted by platform baseline, click-through rate if available, reach relative to audience size (estimated from brand voice). Score written to `content_performance`.

**Insights surface automatically:**
- "Your Bold tone on LinkedIn outperforms Professional by 34%"
- "Instagram Carousels have 2.1× higher engagement than single captions for your audience"
- "Best posting time based on your logs: Tuesday and Thursday"

---

## Automations

### Tier 1 — No External API Approvals

**`deliverWeeklyContentPack`** — Mon 8am SAST
- Reads all active client docs from `clientSubscriptions` (or `leadStreamSubscriptions` pattern)
- Generates 7-day content pack per client via Gemini 2.0 Flash (brand voice injected)
- Formats as HTML email with content grouped by day
- Delivered via SendGrid

**`sendCalendarGapNudge`** — Sun 7pm SAST
- Reads `content_generations` with `scheduledDate` in the next 7 days
- Identifies days with no scheduled content
- Sends alert via existing `sendLeadAlert` channels (Discord/Telegram/WhatsApp)
- Message: "⚠️ Content gap: Wednesday and Friday next week have no scheduled posts"

**`generateMonthlyReport`** — 1st of month 7am SAST
- Queries `content_generations` and `content_performance` for previous month
- Builds branded PDF: total pieces, tone breakdown, top types, calendar heatmap, performance scores
- Delivered via SendGrid to client email

**`triggerAutoRepurpose`** — Firestore onWrite on `content_generations`
- Triggers when `status` field changes to `approved`
- Calls Gemini 2.0 Flash directly via `getAI()` (same pattern as `contentGeneratorProxy`) for each applicable platform variant
- Results saved to `content_generations` with `sourceGenerationId` reference
- Notifies via Discord/Telegram when all variants complete

**`deliverWeeklyTrendBrief`** — Fri 12pm SAST
- Gemini Flash generates 5 trending content ideas for each client's niche + location
- Delivered as WhatsApp message or email
- Format: numbered list with content type suggestion for each idea

**`recycleEvergreenContent`** — every 90 days (quarterly)
- Queries `content_performance` for top-scoring pieces (score ≥ 75)
- Passes each to Gemini 2.0 Flash with instruction to rewrite with fresh angle
- Saves as new `content_generations` doc with `source: 'recycled'` + original `sourceGenerationId`
- Adds to history panel as "Recycled — [original type]"

### Tier 2 — Requires Platform Setup

**`postToSocialPlatform`** — HTTP POST (internal only)
- Accepts: `{ generationId, platform, scheduledAt }`
- Retrieves access token from Firebase secrets per platform per client
- Posts via platform API at scheduled time
- Platforms: Instagram (Meta Graph API), Facebook (Meta Graph API), LinkedIn (LinkedIn API), Twitter/X (X API v2)
- Updates `content_generations` status to `posted` on success
- On failure: retries once, then sets status to `post_failed` and alerts via Discord

**`sendWhatsAppBroadcast`** — HTTP POST (internal only)
- WhatsApp Business API (Meta) for content pack and report delivery
- Approved message templates required per message type
- Fallback to SendGrid email if WhatsApp delivery fails

**`triggerClientApproval`** — HTTP POST + Firestore onWrite
- Triggered when content is marked `ready_for_approval`
- Sends formatted preview to client via WhatsApp or email
- Client replies "Approve" or "Revise [note]"
- Approval: status → `approved` → triggers `triggerAutoRepurpose`
- Revision: status → `revision_requested`, note saved, Drift Studio alerted

---

## File Changes Summary

| File | Change |
|---|---|
| `functions/index.js` | Add `contentGeneratorProxy` + 9 automation functions |
| `src/pages/MarketingGenerator.jsx` | Add mode toggle (Strategy / Content Studio), render ContentStudio component |
| `src/pages/ContentStudio.jsx` | New — full Focus Mode 3-panel layout |
| `src/pages/ContentStudio.css` | New — all Content Studio styles |
| `src/components/ContentTypePanel.jsx` | New — searchable content type sidebar |
| `src/components/ContentOutput.jsx` | New — output area with edit, share, version nav |
| `src/components/ContentCalendar.jsx` | New — monthly calendar grid with drag-to-schedule |
| `src/components/BulkGenerator.jsx` | New — bulk pack generator with progress |
| `src/components/RepurposePanel.jsx` | New — repurpose picker and output |
| `src/components/StudioAnalytics.jsx` | New — Analytics A + B combined dashboard |
| `src/components/BrandVoicePanel.jsx` | New — inline brand voice editor |
| `src/services/contentStudioService.js` | New — Firestore CRUD for content_generations + content_performance |
| `src/firebase/config.js` | Add `CONTENT_GENERATOR_PROXY_URL` |
| `index.html` | Fix og:url, twitter:url, og:image meta tags |

---

## Platform Character Limits (shown in output meta row)

| Platform / Type | Limit |
|---|---|
| Instagram Caption | 2,200 |
| Twitter / X | 280 |
| LinkedIn Post | 3,000 |
| Facebook Post | 63,206 |
| TikTok Script | 2,200 |
| Pinterest Description | 500 |
| Google RSA Headline | 30 (per headline) |
| Google RSA Description | 90 (per description) |
| Meta Title (SEO) | 60 |
| Meta Description (SEO) | 160 |
| Email Subject Line | 60 |

---

## Out of Scope

- Real-time social analytics via platform APIs (documented in `docs/roadmap/live-platform-analytics.md`)
- A/B testing automation (documented in `docs/roadmap/content-automation-tier3.md`)
- Competitor monitoring (documented in `docs/roadmap/content-automation-tier3.md`)
- Payment processing for Content Studio access (invoiced via existing Drift Studio finance system)
- Actual social media publishing UI (Tier 2 functions handle publishing server-side only)
