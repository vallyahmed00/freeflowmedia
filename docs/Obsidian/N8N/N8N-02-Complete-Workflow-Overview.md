---
tags: [n8n, workflows, automation, overview, freeflow-media]
created: 2026-04-13
updated: 2026-04-13
aliases: [N8N Workflows, Workflow Overview, Complete Workflows]
---

# 🔄 N8N - Complete Workflow Overview

## 📋 Overview

This document provides a comprehensive overview of all **5 major workflows** in the N8N automation suite. Each workflow is independent and can be activated separately.

---

## 📊 Workflow Summary

| # | Workflow | Trigger | Status | Purpose |
|---|----------|---------|--------|---------|
| 1 | [[N8N-03-Lead-Processing-Workflow|Lead Processing]] | Webhook (`freeflow-lead`) | ✅ Live | Contact form → Notifications → AI Email |
| 2 | [[N8N-04-Social-Media-Posting|Social Media Posting]] | Schedule (Daily 9 AM) | 🟡 Ready | Auto-post to Instagram, Facebook, TikTok |
| 3 | [[N8N-05-Social-Media-Engagement|Social Media Engagement]] | Webhook (`social-media-inbox`) | 🟡 Ready | AI auto-reply to DMs and comments |
| 4 | [[N8N-06-WhatsApp-Business|WhatsApp Business]] | Webhook (`whatsapp-webhook`) | 🟡 Ready | Templates, images, audio, PDFs |
| 5 | [[N8N-07-Daily-Promo-Schedule|Daily Promo Schedule]] | Schedule (Daily 9 AM) | 🟡 Ready | Automated WhatsApp broadcasts |

**Legend:**
- ✅ Live - Fully configured and ready
- 🟡 Ready - Workflow built, needs credentials to activate
- 🔴 Pending - Needs setup

---

## 🎯 Complete Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    N8N Automation Suite                      │
│                   (5 Independent Workflows)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣ Lead Processing (Webhook-triggered)                    │
│     Form → Sheets → Notifications → Email → AI              │
│                                                              │
│  2️⃣ Social Media Posting (Schedule-triggered)              │
│     Schedule → Fetch from Firebase → IG + FB + TikTok       │
│                                                              │
│  3️⃣ Social Media Engagement (Webhook-triggered)            │
│     Webhook → AI Response → Auto-Reply DMs/Comments         │
│                                                              │
│  4️⃣ WhatsApp Business (Webhook-triggered)                  │
│     Webhook → Templates/Images/Audio/PDFs                   │
│                                                              │
│  5️⃣ Daily Promo Schedule (Schedule-triggered)              │
│     Schedule → Fetch Promos → WhatsApp Broadcast            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Lead Processing Workflow

**Trigger:** Webhook at `/webhook/freeflow-lead`

**Flow:**
```
Website Form Webhook
    ↓
Backup to Google Sheets
    ↓
Multi-Platform Notification (Slack/Discord/Telegram/Email)
    ↓
Send Confirmation Email
    ↓
AI Email Generator (Google Gemini)
    ↓
AI Email via Firebase (fallback)
```

**Nodes:**
1. **Website Form Webhook** (v2)
   - Path: `freeflow-lead`
   - Method: POST
   - Receives contact form data

2. **Backup to Google Sheets** (v4.3)
   - Operation: Append or update
   - Sheet: `Leads`
   - Columns: business_name, email, phone, notes, source, status, created_at

3. **Multi-Platform Notification** (HTTP Request v4.2)
   - URL: Firebase Function `notifyNewLead`
   - Payload: lead data + platforms array
   - Notifies: Slack, Discord, Telegram, Email

4. **Send Confirmation Email** (HTTP Request v4.2)
   - URL: Firebase Function `sendLeadConfirmationEmail`
   - Payload: lead data
   - Sends: Confirmation email to lead

5. **AI Email Generator** (Google Gemini v1)
   - Model: gemini-2.5-pro
   - Temperature: 0.7
   - Max tokens: 500
   - Generates: Personalized outreach email

6. **AI Email via Firebase** (HTTP Request v4.2)
   - URL: Firebase Function `generateOutreachEmail`
   - Fallback if Gemini fails in N8N

**Purpose:**
- Process contact form submissions
- Backup lead data to Google Sheets
- Notify team across multiple platforms
- Send confirmation email to lead
- Generate AI-powered personalized outreach email

**Credentials Needed:**
- Google Sheets OAuth2
- Google Gemini API
- Firebase Functions (already deployed)

**Status:** ✅ Fully configured, needs credentials to activate

---

## 2️⃣ Social Media Posting Workflow

**Trigger:** Schedule (Daily at 9:00 AM)

**Flow:**
```
Social Media Post Schedule (Daily 9 AM)
    ↓
Fetch Scheduled Posts (from Firebase)
    ↓
┌─────────────┬─────────────┬─────────────┐
│             │             │             │
Post to      Post to       Post to      (Parallel)
Instagram    Facebook      TikTok
```

**Nodes:**
1. **Social Media Post Schedule** (Schedule Trigger v1.2)
   - Trigger: Every day at 9:00 AM
   - Timezone: Set in N8N settings

2. **Fetch Scheduled Posts** (HTTP Request v4.2)
   - URL: Firebase Function `getScheduledPosts`
   - Method: GET
   - Returns: Posts scheduled for current time

3. **Post to Instagram** (Facebook Graph API v1)
   - Resource: Instagram
   - Operation: Publish
   - Uses: Caption, media URL, location (optional)

4. **Post to Facebook** (Facebook Graph API v1)
   - Resource: Facebook Page
   - Operation: Publish
   - Uses: Message, link, published: true

5. **Post to TikTok** (HTTP Request v4.2)
   - URL: `https://open.tiktokapis.com/v2/post/publish/video/init/`
   - Method: POST
   - Headers: Authorization with TikTok access token
   - Body: Post info (title, privacy level, comment/duet/stitch settings)

**Purpose:**
- Automatically publish scheduled posts
- Post to all 3 platforms simultaneously
- Fetch content from Firebase (single source of truth)

**Credentials Needed:**
- Facebook Graph API (for Instagram & Facebook)
- TikTok Business API access token

**Status:** 🟡 Workflow ready, needs credentials

---

## 3️⃣ Social Media Engagement Workflow

**Trigger:** Webhook at `/webhook/social-media-inbox`

**Flow:**
```
Social Media Inbox Webhook
    ↓
AI Response Generator (Google Gemini)
    ↓
┌──────────────────┬──────────────────┐
│                  │                  │
Reply to          Reply to          (Based on type)
Instagram DM      FB/IG Comments
```

**Nodes:**
1. **Social Media Inbox Webhook** (v2)
   - Path: `social-media-inbox`
   - Receives: DMs and comments from social platforms
   - Payload: platform, type, from_user, message, conversation_id, etc.

2. **AI Response Generator** (Google Gemini v1)
   - Model: gemini-2.5-pro
   - Temperature: 0.7
   - Max tokens: 300
   - Prompt: Professional social media response
   - Guidelines:
     - Friendly and professional
     - Sales inquiries → Direct to book a call
     - Support questions → Provide helpful answer
     - Under 100 words
     - Use appropriate emojis
     - Sign off: "- Drift Studio Team"

3. **Reply to Instagram DM** (Facebook Graph API v1)
   - Resource: Instagram
   - Operation: Reply
   - Uses: AI-generated response, conversation ID

4. **Reply to Facebook/Instagram Comment** (Facebook Graph API v1)
   - Resource: Comment
   - Operation: Reply
   - Uses: AI-generated response, post ID, comment ID

**Purpose:**
- Auto-reply to social media messages
- AI-powered response generation
- Platform-aware responses
- Sales inquiry detection
- Support question handling

**Credentials Needed:**
- Google Gemini API
- Facebook Graph API (for Instagram & Facebook)

**Status:** 🟡 Workflow ready, needs credentials

---

## 4️⃣ WhatsApp Business Workflow

**Trigger:** Webhook at `/webhook/whatsapp-webhook`

**Flow:**
```
WhatsApp Webhook (Inbound Messages)
    ↓
┌──────────────┬──────────────┬──────────────┬──────────────┐
│              │              │              │              │
Send Promo     Send Product   Send Audio     Send PDF      (Parallel branches)
Template       Image          (Sound/Voice)  (Specs)
```

**Nodes:**
1. **WhatsApp Webhook** (v2)
   - Path: `whatsapp-webhook`
   - Receives: Inbound WhatsApp messages
   - Payload: from, customer_name, message type

2. **Send WhatsApp Promo Template** (HTTP Request v4.2)
   - URL: `https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`
   - Type: Template message
   - Template: `product_promo`
   - Variables: Customer name

3. **Send WhatsApp Product Image** (HTTP Request v4.2)
   - URL: WhatsApp Messages endpoint
   - Type: Image
   - Payload: Image URL, caption

4. **Send WhatsApp Audio** (HTTP Request v4.2)
   - URL: WhatsApp Messages endpoint
   - Type: Audio
   - Payload: Audio URL (product sounds, voice notes)

5. **Send WhatsApp Product Specs PDF** (HTTP Request v4.2)
   - URL: WhatsApp Messages endpoint
   - Type: Document
   - Payload: PDF URL, caption, filename

**Purpose:**
- Respond to customer WhatsApp messages
- Send promotional templates
- Share product images with captions
- Send audio clips (product sounds, voice notes)
- Send product specification PDFs

**Credentials Needed:**
- WhatsApp Business API access token
- Phone Number ID
- Meta Business Account

**Status:** 🟡 Workflow ready, needs credentials

---

## 5️⃣ Daily Promo Schedule Workflow

**Trigger:** Schedule (Daily at 9:00 AM)

**Flow:**
```
Daily Promo Schedule (Daily 9 AM)
    ↓
Fetch Daily Promos (from Firebase)
    ↓
Send Scheduled WhatsApp Promo
```

**Nodes:**
1. **Daily Promo Schedule** (Schedule Trigger v1.2)
   - Trigger: Every day at 9:00 AM
   - Timezone: Set in N8N settings

2. **Fetch Daily Promos** (HTTP Request v4.2)
   - URL: Firebase Function `getWhatsAppPromos`
   - Method: GET
   - Returns: Scheduled promotional content

3. **Send Scheduled WhatsApp Promo** (HTTP Request v4.2)
   - URL: WhatsApp Messages endpoint
   - Type: Template message
   - Payload:
     - Customer phone number
     - Template name
     - Template variables (customizable per promo)

**Purpose:**
- Automated daily promotional broadcasts
- Fetch promotional content from Firebase
- Send to customer list via WhatsApp
- Schedule-based (no manual trigger needed)

**Credentials Needed:**
- WhatsApp Business API access token
- Phone Number ID

**Status:** 🟡 Workflow ready, needs credentials

---

## 🔗 Workflow Relationships

### Independent Workflows

All 5 workflows are **independent** and can run separately:
- ✅ Lead Processing works without Social Media workflows
- ✅ Social Media Posting works without WhatsApp
- ✅ Each workflow has its own trigger
- ✅ Failure in one doesn't affect others

### Shared Resources

**Credentials:**
- Facebook Graph API used by: Social Media Posting + Social Media Engagement
- Google Gemini used by: Lead Processing + Social Media Engagement
- WhatsApp API used by: WhatsApp Business + Daily Promo Schedule

**Firebase Functions:**
- `notifyNewLead` - Called by Lead Processing
- `sendLeadConfirmationEmail` - Called by Lead Processing
- `generateOutreachEmail` - Called by Lead Processing
- `getScheduledPosts` - Called by Social Media Posting
- `getWhatsAppPromos` - Called by Daily Promo Schedule
- `n8nWebhookHandler` - Receives events from all workflows

---

## 📊 Node Count by Workflow

| Workflow | Node Count | Sticky Notes |
|----------|------------|--------------|
| Lead Processing | 6 | 1 |
| Social Media Posting | 5 | 1 |
| Social Media Engagement | 4 | 1 |
| WhatsApp Business | 5 | 1 |
| Daily Promo Schedule | 3 | 1 |
| **Total** | **23** | **5** |

---

## 🎯 Activation Guide

### Activate Individual Workflows

**Step 1: Open N8N Dashboard**
```
http://localhost:5678 (self-hosted) or https://your-n8n-instance.com
```

**Step 2: Import Workflow**
```
Workflows → Import → Select n8n-marketing-workflow.json
```

**Step 3: Configure Credentials**
- Click each node with credential icon
- Select or create credential
- Test connection

**Step 4: Set Environment Variables**
```
Settings → Environment Variables → Add:
- GOOGLE_SHEETS_ID
- TIKTOK_ACCESS_TOKEN
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
- GEMINI_API_KEY
```

**Step 5: Activate**
- Toggle "Active" to ON
- Monitor execution logs
- Test with sample data

### Recommended Activation Order

1. **Lead Processing** (highest priority - captures leads)
2. **Social Media Posting** (consistent brand presence)
3. **WhatsApp Business** (direct customer communication)
4. **Social Media Engagement** (respond to audience)
5. **Daily Promo Schedule** (automated marketing)

---

## 🔍 Monitoring Workflows

### Check Execution Status

**N8N Dashboard:**
```
Executions → Filter by workflow → View recent runs
```

**Success Indicators:**
- ✅ Green checkmark - Execution succeeded
- ⚠️ Yellow warning - Execution had warnings
- ❌ Red X - Execution failed (check error message)

### Check Firebase Events

**Firebase Logs:**
```bash
# All function logs
firebase functions:log

# Specific function
firebase functions:log --only notifyNewLead
```

**Firestore Collections:**
- `leads` - New leads from Lead Processing
- `strategies` - Strategies from AI generation
- `scheduledPosts` - Posts fetched by Social Media Posting
- `whatsappPromos` - Promos fetched by Daily Promo Schedule

---

## ⚠️ Important Notes

### Webhook URLs

**Production URLs:**
```
https://your-n8n-domain.com/webhook/freeflow-lead
https://your-n8n-domain.com/webhook/social-media-inbox
https://your-n8n-domain.com/webhook/whatsapp-webhook
```

**Test URLs (only for manual testing):**
```
https://your-n8n-domain.com/webhook-test/freeflow-lead
https://your-n8n-domain.com/webhook-test/social-media-inbox
https://your-n8n-domain.com/webhook-test/whatsapp-webhook
```

**Never use test URLs in production!**

### Schedule Timezones

- Schedules use N8N instance timezone
- Set in N8N Settings → Timezone
- Recommended: `Africa/Johannesburg` (SAST) or your local timezone
- All schedule triggers use this timezone

### Rate Limits

**WhatsApp Business API:**
- Template messages: Must be pre-approved by Meta
- Media messages: 80 MB limit per file
- Rate limit: Varies by phone number quality rating

**Social Media APIs:**
- Instagram: 200 posts/hour
- Facebook: 200 posts/hour
- TikTok: 100 posts/hour

**Google Gemini:**
- Free tier: 60 requests/minute
- Paid: Higher limits

---

## 🔗 Related Resources

- [[N8N-00-Changes-Index|N8N Changes Index]]
- [[N8N-03-Lead-Processing-Workflow|Lead Processing Workflow]]
- [[N8N-04-Social-Media-Posting|Social Media Posting]]
- [[N8N-05-Social-Media-Engagement|Social Media Engagement]]
- [[N8N-06-WhatsApp-Business|WhatsApp Business]]
- [[N8N-07-Daily-Promo-Schedule|Daily Promo Schedule]]
- [[N8N-08-Credential-Setup|Credential Setup]]

---

**Last updated:** 2026-04-13
**Version:** 2.0
**Maintainer:** Drift Studio Team
