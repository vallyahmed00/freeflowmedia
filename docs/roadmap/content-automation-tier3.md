# Roadmap: Content Automation — Tier 3

**Status:** Future — build after Content Studio v1 automations are stable  
**Prerequisite:** Sufficient performance data history in `content_performance` Firestore collection

---

## A/B Content Testing

Auto-generate 2 variants per post with different tones or angles. Track which performs better via the manual performance tracker. After 5 rounds of data per content type, AI builds a scoring model that learns which tone/format wins for that specific client's audience.

**Implementation notes:**
- Generate variant B automatically when user marks content as "ready to test"
- Both variants stored in `content_generations` with `variant: 'A' | 'B'` field
- Performance entries in `content_performance` linked to variant
- After 5 data points per type: Cloud Function runs scoring → writes `audienceProfile.bestTone` and `audienceProfile.bestFormat` to client's brand voice doc
- UI: side-by-side variant comparison in history panel, winner badge after results logged

---

## Competitor Content Monitor

Weekly scan of competitor social accounts using Apify (already integrated for lead generation). Flags their top-performing posts. AI auto-suggests counter-content ideas based on gaps and angles the competitor isn't covering.

**Implementation notes:**
- Competitor URLs stored per client in brand voice / settings doc
- Apify actor: `apify/instagram-scraper` or `apify/facebook-pages-scraper`
- Scheduled Cloud Function weekly → Apify run → top 5 posts by engagement → Gemini analyses gaps → email/WhatsApp briefing to Drift Studio (not direct to client in v1)
- Output: "Your competitor posted X — here's an angle they missed: [suggestion]"
- Requires Apify quota increase for social scraping at scale

---

## Related

- Content Studio Analytics (A+B): `docs/superpowers/specs/2026-05-18-content-studio-design.md`
- Live Platform Analytics: `docs/roadmap/live-platform-analytics.md`
