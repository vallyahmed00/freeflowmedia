# Roadmap: Live Platform Analytics (Analytics C)

**Status:** Future — build after Content Studio v1 has traction  
**Effort:** High (4–6 weeks per platform + ongoing maintenance)

## What It Is

Real-time ad analytics pulled directly from social platform APIs. Clients connect their ad accounts via OAuth and see live impressions, clicks, ROAS, and spend without leaving the Content Studio.

## Platforms to Support (in priority order)

| Platform | API | Auth | Notes |
|---|---|---|---|
| Meta Ads (FB + IG) | Meta Marketing API | OAuth 2.0 | Requires Business Manager + app review (2–4 weeks) |
| Google Ads | Google Ads API | OAuth 2.0 | Requires developer token approval (2–4 weeks) |
| LinkedIn Ads | LinkedIn Marketing API | OAuth 2.0 | Partner program required for full access |
| TikTok Ads | TikTok Marketing API | OAuth 2.0 | Sandbox available, production needs approval |

## Key Metrics to Expose

- Impressions, reach, clicks, CTR
- Ad spend (ZAR + original currency)
- ROAS, CPC, CPM
- Conversion events (pixel-based)
- Weekly comparison (WoW delta)
- Top-performing content by type

## Architecture Notes

- Store OAuth tokens encrypted in Firestore per client doc
- Sync job: Cloud Function scheduled daily to pull and cache metrics
- Never expose access tokens to frontend — proxy all API calls through Cloud Functions
- One `adAccountId` per client, per platform
- Dashboard: 7-day sparkline per platform, combined totals strip at top

## Prerequisite for Each Platform

**Meta:** Facebook App Review for `ads_read` permission  
**Google:** Apply for Standard Access developer token (not Test Account)  
**LinkedIn:** Apply for Marketing Developer Platform partner status  
**TikTok:** Business API access request through TikTok for Business

## Suggested Firebase Collections

```
adAccounts/{clientId}/platforms/{platformId}
  accessToken: string (encrypted)
  refreshToken: string (encrypted)
  accountId: string
  connectedAt: Timestamp
  lastSyncAt: Timestamp

adMetrics/{clientId}/daily/{date}_{platformId}
  impressions: number
  clicks: number
  spend: number
  roas: number
  syncedAt: Timestamp
```

## Why It's Deferred

- Each platform requires 2–4 weeks of API approval before any real data can flow
- Maintaining OAuth token refresh logic adds significant backend complexity
- For most SME clients, manual tracking (Analytics B) delivers 80% of the value with 5% of the effort
- Build this when clients are actively asking for it — not before

## Related

- Content Studio Analytics (A+B): `docs/superpowers/specs/2026-05-18-content-studio-design.md`
