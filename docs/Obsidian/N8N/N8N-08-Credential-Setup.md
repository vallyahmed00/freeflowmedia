---
tags: [n8n, credentials, setup, configuration, freeflow-media]
created: 2026-04-13
updated: 2026-04-13
aliases: [N8N Credentials, Credential Setup, API Configuration]
---

# 🔑 N8N - Credential Setup Guide

## 📋 Overview

This guide walks you through setting up **all required credentials** for the N8N automation suite. Each credential is needed for specific workflows.

---

## 📊 Credentials Summary

| Credential | Workflows Used | Setup Time | Cost |
|------------|----------------|------------|------|
| Google Sheets OAuth2 | Lead Processing | 5 mins | Free |
| Google Gemini API | Lead Processing, Social Engagement | 5 mins | Free tier |
| Facebook Graph API | Social Posting, Social Engagement | 10 mins | Free |
| TikTok Business API | Social Posting | 10 mins | Free |
| WhatsApp Business API | WhatsApp Business, Daily Promo | 15 mins | Free tier |
| Firebase Functions | All workflows | Already deployed | Free tier |

**Total Setup Time:** ~45 minutes
**Total Cost:** $0 (all free tiers)

---

## 1️⃣ Google Sheets OAuth2

**Used By:** Lead Processing workflow (Backup to Google Sheets node)

### Setup Steps

**Step 1: Create Google Cloud Project**
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable **Google Sheets API**
4. Enable **Google Drive API**

**Step 2: Create OAuth 2.0 Credentials**
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `N8N Google Sheets`
5. Authorized redirect URIs:
   ```
   https://your-n8n-domain.com/rest/oauth2-credential/callback
   ```
   (For local: `http://localhost:5678/rest/oauth2-credential/callback`)
6. Click **Create**
7. Copy **Client ID** and **Client Secret**

**Step 3: Add Credential in N8N**
1. N8N Dashboard → **Credentials** → **Add Credential**
2. Type: **Google Sheets OAuth2 API**
3. Name: `Google Sheets Account`
4. Fill in:
   - Client ID: (from Step 2)
   - Client Secret: (from Step 2)
5. Click **Connect**
6. Authorize with your Google account
7. Save

**Step 4: Set Environment Variable**
```
Settings → Environment Variables → Add:
Name: GOOGLE_SHEETS_ID
Value: Your Google Sheet ID (from sheet URL)
```

**Get Sheet ID:**
- Open your Google Sheet
- URL looks like: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
- Copy the `{SHEET_ID}` part

### Testing

1. Create a sheet named "Leads"
2. Add headers in row 1: `business_name`, `email`, `phone`, `notes`, `source`, `status`, `created_at`
3. In N8N, run "Backup to Google Sheets" node manually
4. Check if test data appears in sheet

---

## 2️⃣ Google Gemini API

**Used By:** Lead Processing (AI Email Generator), Social Engagement (AI Response Generator)

### Setup Steps

**Step 1: Get API Key**
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click **Create API Key**
4. Copy the API key

**Step 2: Add Credential in N8N**
1. N8N Dashboard → **Credentials** → **Add Credential**
2. Type: **Google Gemini (Palm) API**
3. Name: `Google Gemini API`
4. API Key: (paste from Step 1)
5. Save

**Step 3: Set Environment Variable (Optional)**
```
Settings → Environment Variables → Add:
Name: GEMINI_API_KEY
Value: (your API key)
```

### Testing

1. Open "AI Email Generator" node in workflow
2. Click **Execute Node**
3. Should see AI-generated email in output
4. Check for errors (invalid API key, rate limit, etc.)

### Pricing

- **Free tier:** 60 requests/minute
- **Paid:** $0.00025 per 1K tokens
- **Recommended:** Start with free tier, upgrade if needed

---

## 3️⃣ Facebook Graph API

**Used By:** Social Posting (Instagram + Facebook), Social Engagement (DMs + Comments)

### Setup Steps

**Step 1: Create Meta Developer Account**
1. Go to https://developers.facebook.com/
2. Click **Get Started** → Create developer account
3. Accept terms

**Step 2: Create App**
1. **My Apps** → **Create App**
2. App type: **Business**
3. App name: `Drift Studio Social`
4. Click **Create**

**Step 3: Add Products**
1. In app dashboard, scroll to **Add Products**
2. Add:
   - **Instagram** → Set up
   - **Facebook Login** → Set up

**Step 4: Configure Instagram**
1. Go to **Instagram** → **Settings**
2. Link your Instagram Business account
3. If not already Business account:
   - Open Instagram app → Settings → Account → Switch to Professional Account → Business
4. Note your **Instagram Account ID**

**Step 5: Get Access Token**
1. Go to **Facebook Login** → **Settings**
2. Add your website URL (or `http://localhost:5173` for local)
3. Go to **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
4. Select your app
5. Permissions needed:
   - `pages_show_list`
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_manage_posts`
   - `instagram_manage_comments`
   - `pages_manage_engagement`
   - `instagram_manage_insights`
6. Click **Generate Access Token**
7. Authorize with your Facebook account
8. Copy **Page Access Token** (long-lived)

**Step 6: Add Credential in N8N**
1. N8N Dashboard → **Credentials** → **Add Credential**
2. Type: **Facebook Graph API**
3. Name: `Facebook Graph API`
4. Access Token: (paste from Step 5)
5. Save

### Testing

1. Open "Post to Instagram" node
2. Click **Execute Node**
3. Check Instagram account - should see test post
4. Check Facebook Page - should see test post

### Important Notes

- Access tokens expire! Use **long-lived tokens** (60 days)
- Refresh tokens before expiration
- Instagram requires Business account
- Facebook requires Page admin access

---

## 4️⃣ TikTok Business API

**Used By:** Social Posting (Post to TikTok node)

### Setup Steps

**Step 1: Create TikTok Developer Account**
1. Go to https://developers.tiktok.com/
2. Click **Log in** → Create developer account
3. Accept developer agreement

**Step 2: Create App**
1. **My Apps** → **Create App**
2. App name: `Drift Studio TikTok`
3. App description: "Automated posting"
4. Platform: **Web**
5. Website: Your website URL
6. Click **Submit**

**Step 3: Request Permissions**
1. Go to app → **Permissions**
2. Request:
   - **Video Upload** (to publish videos)
   - **User Info Basic** (to get user ID)
3. Submit for review (may take 1-3 days)

**Step 4: Get Access Token**
1. Once approved, go to **App Credentials**
2. Copy **Client Key** and **Client Secret**
3. Use OAuth flow to get access token:
   ```
   GET https://www.tiktok.com/v2/auth/authorize/
     ?client_key=YOUR_CLIENT_KEY
     &scope=user.info.basic,video.upload
     &response_type=code
     &redirect_uri=YOUR_REDIRECT_URI
   ```
4. Exchange code for access token
5. Copy **Access Token**

**Step 5: Set Environment Variable in N8N**
```
Settings → Environment Variables → Add:
Name: TIKTOK_ACCESS_TOKEN
Value: (your access token)
```

### Testing

1. Open "Post to TikTok" node
2. Use test video URL
3. Click **Execute Node**
4. Check TikTok account - should see test video

### Important Notes

- Access tokens expire (typically 24 hours to 30 days)
- Implement token refresh logic
- Video upload requires approval
- TikTok API in beta - may have limitations

---

## 5️⃣ WhatsApp Business API

**Used By:** WhatsApp Business workflow, Daily Promo Schedule

### Setup Steps

**Step 1: Create Meta Business Account**
1. Go to https://business.facebook.com/
2. Create business account (or use existing)
3. Verify business (required for WhatsApp API)

**Step 2: Set Up WhatsApp Business Platform**
1. Go to https://developers.facebook.com/
2. Create app (or use existing from Facebook Graph API setup)
3. Add product: **WhatsApp** → Set up
4. Follow setup wizard

**Step 3: Get Phone Number**
1. In app → **WhatsApp** → **API Setup**
2. Add phone number (business phone)
3. Verify phone number via SMS/call
4. Note **Phone Number ID** (displayed after verification)

**Step 4: Get Access Token**
1. In app → **WhatsApp** → **API Setup**
2. Copy **Temporary Access Token** (for testing)
3. For production, generate permanent token:
   - Go to app → **Settings** → **Basic**
   - Copy **App ID** and **App Secret**
   - Generate system user token with `whatsapp_business_messaging` permission

**Step 5: Create Message Templates**
1. Go to https://business.facebook.com/
2. **WhatsApp Manager** → **Message Templates**
3. Create template:
   - Name: `product_promo`
   - Language: English
   - Category: Marketing
   - Body: "Hi {{1}}, check out our latest products! ..."
4. Submit for approval (usually approved within hours)

**Step 6: Set Environment Variables in N8N**
```
Settings → Environment Variables → Add:
Name: WHATSAPP_ACCESS_TOKEN
Value: (your access token)

Name: WHATSAPP_PHONE_NUMBER_ID
Value: (your phone number ID)
```

### Testing

1. Use WhatsApp API test endpoint:
   ```bash
   curl -X POST https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "messaging_product": "whatsapp",
       "to": "YOUR_TEST_PHONE_NUMBER",
       "type": "template",
       "template": {
         "name": "product_promo",
         "language": { "code": "en" }
       }
     }'
   ```
2. Check if message received on test phone

### Important Notes

- Template messages must be pre-approved
- Session messages (24-hour window) don't need templates
- Media limit: 80 MB per file
- Rate limits depend on phone number quality rating
- Business verification required for production use

---

## 6️⃣ Firebase Functions (Already Deployed)

**Used By:** All workflows (notifications, emails, data fetching)

### Status

✅ **Already deployed and working!**

No setup needed - Firebase Functions are already configured:
- `notifyNewLead`
- `sendLeadConfirmationEmail`
- `generateOutreachEmail`
- `getScheduledPosts`
- `getWhatsAppPromos`
- `n8nWebhookHandler`

### Verify Deployment

```bash
# Check function status
firebase functions:log

# Test function
curl -X POST https://us-central1-freeflow-media.cloudfunctions.net/notifyNewLead \
  -H "Content-Type: application/json" \
  -d '{"lead": {"test": true}, "platforms": ["slack"]}'
```

---

## 🔧 Environment Variables Setup

### In N8N Dashboard

**Location:** Settings → Environment Variables

**Required Variables:**
```env
GOOGLE_SHEETS_ID=your_sheet_id
TIKTOK_ACCESS_TOKEN=your_token
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
GEMINI_API_KEY=your_key
```

### In Frontend (.env.local)

**Location:** Project root `.env.local`

**Optional Variable:**
```env
VITE_N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook/freeflow-lead
```

**Note:** Leave empty or omit if not using N8N (Firebase handles everything).

---

## ✅ Credential Checklist

| Credential | Status | Notes |
|------------|--------|-------|
| Google Sheets OAuth2 | ⬜ Not Started | Follow steps above |
| Google Gemini API | ⬜ Not Started | 5 min setup |
| Facebook Graph API | ⬜ Not Started | 10 min setup |
| TikTok Business API | ⬜ Not Started | Requires approval |
| WhatsApp Business API | ⬜ Not Started | Requires business verification |
| Firebase Functions | ✅ Deployed | No action needed |

---

## 🔍 Testing All Credentials

### Quick Test Script

Run this in N8N dashboard to test all credentials:

1. **Test Google Sheets:**
   - Open "Backup to Google Sheets" node
   - Execute → Check if data appears in sheet

2. **Test Google Gemini:**
   - Open "AI Email Generator" node
   - Execute → Check if AI generates email

3. **Test Facebook Graph API:**
   - Open "Post to Instagram" node
   - Execute → Check if post appears on Instagram

4. **Test TikTok API:**
   - Open "Post to TikTok" node
   - Execute → Check if video appears on TikTok

5. **Test WhatsApp API:**
   - Open "Send WhatsApp Promo Template" node
   - Execute → Check if message received

6. **Test Firebase Functions:**
   - Open "Multi-Platform Notification" node
   - Execute → Check Firebase logs

---

## ⚠️ Common Issues

### Google Sheets

**Issue:** "Invalid credentials"
- **Solution:** Re-authorize OAuth2, check redirect URI matches N8N URL

**Issue:** "Sheet not found"
- **Solution:** Verify `GOOGLE_SHEETS_ID` is correct, sheet exists, has "Leads" tab

### Google Gemini

**Issue:** "API key invalid"
- **Solution:** Check API key copied correctly, no extra spaces

**Issue:** "Rate limit exceeded"
- **Solution:** Wait and retry, or upgrade to paid tier

### Facebook Graph API

**Issue:** "Invalid access token"
- **Solution:** Token expired, generate new long-lived token

**Issue:** "Permissions missing"
- **Solution:** Re-authorize with all required permissions

### TikTok API

**Issue:** "App not approved"
- **Solution:** Wait for approval (1-3 days)

**Issue:** "Invalid token"
- **Solution:** Token expired, implement refresh logic

### WhatsApp Business API

**Issue:** "Template not approved"
- **Solution:** Create and approve template in Meta Business Manager

**Issue:** "Invalid phone number ID"
- **Solution:** Verify phone number in WhatsApp Manager

---

## 🔗 Related Resources

- [[N8N-00-Changes-Index|N8N Changes Index]]
- [[N8N-02-Complete-Workflow-Overview|Complete Workflow Overview]]
- [[N8N-11-Deployment-Guide|Deployment Guide]]
- [[N8N-12-Troubleshooting|Troubleshooting Guide]]

---

**Last updated:** 2026-04-13
**Version:** 2.0
**Maintainer:** Drift Studio Team
