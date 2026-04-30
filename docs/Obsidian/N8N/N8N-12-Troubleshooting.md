---
tags: [n8n, troubleshooting, errors, debugging, freeflow-media]
created: 2026-04-13
updated: 2026-04-13
aliases: [N8N Troubleshooting, Debugging, Common Issues]
---

# 🔧 N8N - Troubleshooting Guide

## 📋 Overview

This guide covers **common issues** with N8N workflows and their solutions. Use this when workflows fail or behave unexpectedly.

---

## 🚨 Quick Diagnostic

### Step 1: Check N8N Status

**Self-Hosted:**
```bash
# Check if N8N is running
docker ps | grep n8n

# Check logs
docker logs n8n --tail 100
```

**Cloud:**
```
N8N Dashboard → Settings → System Health
```

### Step 2: Check Workflow Status

```
N8N Dashboard → Workflows → Check "Active" status
```
- ✅ Active toggle ON
- ❌ Active toggle OFF (activate it)

### Step 3: Check Recent Executions

```
N8N Dashboard → Executions → Filter by workflow
```
- Green checkmark: Success
- Red X: Failed (click to see error)
- Yellow warning: Partial success

### Step 4: Check Firebase Logs

```bash
firebase functions:log --only n8nWebhookHandler
```

---

## 📊 Common Issues by Workflow

### Lead Processing Workflow

#### Issue 1: Webhook Not Receiving Data

**Symptoms:**
- Contact form submits but N8N doesn't trigger
- No executions in N8N dashboard

**Possible Causes:**
1. N8N not running
2. Webhook URL incorrect
3. `VITE_N8N_WEBHOOK_URL` not set
4. Firewall blocking webhook

**Solutions:**

**1. Verify N8N is Running:**
```bash
# Self-hosted
docker ps | grep n8n

# Should show n8n container running
```

**2. Check Webhook URL:**
```env
# .env.local
VITE_N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook/freeflow-lead
```

**Production URLs:**
```
Self-hosted (local):    http://localhost:5678/webhook/freeflow-lead
Self-hosted (tunnel):   https://your-tunnel.com/webhook/freeflow-lead
N8N Cloud:              https://your-instance.app.n8n.cloud/webhook/freeflow-lead
```

**⚠️ Common Mistake:**
```
❌ http://localhost:5678/webhook-test/freeflow-lead  (test URL, only for manual testing)
✅ https://your-domain.com/webhook/freeflow-lead      (production URL)
```

**3. Test Webhook Manually:**
```bash
curl -X POST https://your-n8n-domain.com/webhook/freeflow-lead \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "business_name": "Test Business",
      "email": "test@example.com",
      "phone": "+1234567890",
      "notes": "Test lead"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "executionId": "12345"
}
```

**If you get:**
- `404 Not Found` → Webhook path incorrect
- `502 Bad Gateway` → N8N not running
- `Connection refused` → N8N not accessible

---

#### Issue 2: Google Sheets Backup Fails

**Symptoms:**
- Lead processing stops at "Backup to Google Sheets" node
- Error: "Invalid credentials" or "Sheet not found"

**Solutions:**

**1. Check OAuth Credentials:**
```
N8N Dashboard → Credentials → Google Sheets Account
```
- Should show "Connected" status
- If not, re-authorize

**2. Re-authorize Google Sheets:**
1. Delete old credential
2. Create new Google Sheets OAuth2 credential
3. Authorize with Google account
4. Test connection

**3. Verify Sheet Exists:**
- Open Google Sheets
- Check sheet with ID `GOOGLE_SHEETS_ID` exists
- Verify it has "Leads" tab
- Check headers match: `business_name`, `email`, `phone`, `notes`, `source`, `status`, `created_at`

**4. Check Environment Variable:**
```
N8N Dashboard → Settings → Environment Variables
```
- Verify `GOOGLE_SHEETS_ID` is set
- ID should match your sheet (from URL)

**5. Test Sheet Access:**
```bash
# Use Google Sheets API explorer
# https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
# Enter your sheet ID
# Should return sheet metadata
```

---

#### Issue 3: AI Email Generation Fails

**Symptoms:**
- "AI Email Generator" node fails
- Error: "API key invalid" or "Rate limit exceeded"

**Solutions:**

**1. Check Gemini API Key:**
```
N8N Dashboard → Credentials → Google Gemini API
```
- Verify API key is correct
- Test API key: https://aistudio.google.com/app/apikey

**2. Test Gemini API:**
```bash
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello"}]
    }]
  }'
```

**Expected Response:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{"text": "Hi there!"}]
    }
  }]
}
```

**3. Check Rate Limits:**
- Free tier: 60 requests/minute
- If exceeded, wait or upgrade to paid tier

**4. Use Firebase Fallback:**
- If Gemini fails in N8N, "AI Email via Firebase" node should handle it
- Verify Firebase function `generateOutreachEmail` is deployed

---

#### Issue 4: Multi-Platform Notifications Fail

**Symptoms:**
- "Multi-Platform Notification" node fails
- Error: "Connection refused" or "Function not found"

**Solutions:**

**1. Verify Firebase Function URL:**
```
https://us-central1-freeflow-media.cloudfunctions.net/notifyNewLead
```
- Check project ID is correct (`freeflow-media`)
- Check function name is correct (`notifyNewLead`)

**2. Check Function Deployment:**
```bash
firebase functions:log --only notifyNewLead
```
- If no logs, function not deployed
- Deploy: `firebase deploy --only functions:notifyNewLead`

**3. Test Function:**
```bash
curl -X POST https://us-central1-freeflow-media.cloudfunctions.net/notifyNewLead \
  -H "Content-Type: application/json" \
  -d '{
    "lead": {
      "business_name": "Test",
      "email": "test@example.com"
    },
    "platforms": ["slack"]
  }'
```

---

### Social Media Posting Workflow

#### Issue 1: Posts Not Publishing

**Symptoms:**
- Schedule triggers but posts don't appear on social media
- "Post to Instagram/Facebook/TikTok" nodes fail

**Solutions:**

**1. Check Facebook Graph API Credentials:**
```
N8N Dashboard → Credentials → Facebook Graph API
```
- Access token may have expired
- Generate new long-lived token (60 days)

**2. Verify Instagram Business Account:**
- Instagram must be Business account
- Must be linked to Facebook Page
- Test in Facebook Graph API Explorer

**3. Check TikTok Access Token:**
```
N8N Dashboard → Settings → Environment Variables → TIKTOK_ACCESS_TOKEN
```
- Tokens expire (24 hours to 30 days)
- Refresh token if expired

**4. Verify Post Data Format:**
- Instagram: Requires image URL, caption
- Facebook: Requires message, link
- TikTok: Requires video URL, title, privacy settings

**5. Check API Permissions:**
- Facebook: `pages_manage_posts`, `instagram_manage_posts`
- TikTok: `video.upload`
- Re-authorize if permissions missing

---

#### Issue 2: Scheduled Posts Not Fetched

**Symptoms:**
- "Fetch Scheduled Posts" node returns empty array
- No posts to publish

**Solutions:**

**1. Check Firebase Function:**
```bash
firebase functions:log --only getScheduledPosts
```

**2. Verify Firestore Data:**
```
Firebase Console → Firestore → scheduledPosts collection
```
- Should have documents with `scheduledDate` in past
- Should have `published: false`

**3. Test Function:**
```bash
curl https://us-central1-freeflow-media.cloudfunctions.net/getScheduledPosts
```

**Expected Response:**
```json
{
  "success": true,
  "posts": [
    {
      "id": "post123",
      "caption": "Test post",
      "mediaUrl": "https://...",
      "scheduledDate": "2026-04-13T09:00:00"
    }
  ]
}
```

---

### Social Media Engagement Workflow

#### Issue 1: Webhook Not Receiving DMs/Comments

**Symptoms:**
- Social media inbox webhook not triggering
- AI responses not generated

**Solutions:**

**1. Verify Webhook Path:**
```
/webhook/social-media-inbox
```
- Check path matches exactly
- Test manually with curl

**2. Check Facebook App Permissions:**
- Must have `instagram_manage_insights`, `pages_manage_engagement`
- Re-authorize if needed

**3. Verify Webhook Subscription:**
- Facebook/Instagram must be configured to send events to your webhook
- Check Facebook App → Webhooks → Subscriptions

---

#### Issue 2: AI Responses Not Posting

**Symptoms:**
- AI generates response but "Reply to Instagram DM" fails
- Error: "Invalid conversation ID"

**Solutions:**

**1. Check Conversation ID:**
- Must be valid conversation ID from webhook payload
- Verify it's passed correctly through workflow

**2. Verify Facebook Graph API Version:**
- Using v18.0 or later
- Older versions may not support reply endpoint

**3. Check Rate Limits:**
- Instagram: 200 replies/hour
- Facebook: 200 replies/hour
- Wait if limit exceeded

---

### WhatsApp Business Workflow

#### Issue 1: Messages Not Sending

**Symptoms:**
- "Send WhatsApp Promo Template" node fails
- Error: "Invalid phone number" or "Template not approved"

**Solutions:**

**1. Verify Phone Number ID:**
```
N8N Dashboard → Settings → Environment Variables → WHATSAPP_PHONE_NUMBER_ID
```
- Must match your verified business phone
- Check in Meta Business Manager → WhatsApp → Phone Numbers

**2. Check Access Token:**
```
N8N Dashboard → Settings → Environment Variables → WHATSAPP_ACCESS_TOKEN
```
- Token may have expired
- Regenerate in Meta Business Manager

**3. Verify Template Approved:**
```
Meta Business Manager → WhatsApp → Message Templates
```
- Template `product_promo` must exist and be approved
- If rejected, fix and resubmit

**4. Test WhatsApp API:**
```bash
curl -X POST https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "YOUR_TEST_PHONE",
    "type": "template",
    "template": {
      "name": "product_promo",
      "language": { "code": "en" }
    }
  }'
```

**Expected Response:**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "+1234567890", "wa_id": "1234567890" }],
  "messages": [{ "id": "message_id_123" }]
}
```

---

#### Issue 2: Media Messages Fail

**Symptoms:**
- "Send WhatsApp Product Image" fails
- Error: "Invalid media URL" or "File too large"

**Solutions:**

**1. Check Media URL:**
- Must be publicly accessible HTTPS URL
- Must not require authentication
- Test URL in browser (should download/open)

**2. Verify File Size:**
- WhatsApp limit: 80 MB per file
- Compress image if too large

**3. Check File Format:**
- Images: JPEG, PNG
- Audio: OPUS, AAC, MP3
- Documents: PDF, DOC, DOCX

---

### Daily Promo Schedule Workflow

#### Issue 1: Promos Not Fetched

**Symptoms:**
- "Fetch Daily Promos" returns empty
- No promotional messages sent

**Solutions:**

**1. Check Firebase Function:**
```bash
firebase functions:log --only getWhatsAppPromos
```

**2. Verify Firestore Data:**
```
Firebase Console → Firestore → whatsappPromos collection
```
- Should have promotional content
- Should be scheduled for today

**3. Test Function:**
```bash
curl https://us-central1-freeflow-media.cloudfunctions.net/getWhatsAppPromos
```

---

## 🔍 General Debugging Steps

### Step 1: Check N8N Execution Logs

```
N8N Dashboard → Executions → Click failed execution
```

**Look for:**
- Red node (failed node)
- Error message in node details
- Input/output data

**Common Errors:**
- `ECONNREFUSED` → Service not running
- `401 Unauthorized` → Invalid credentials
- `404 Not Found` → Invalid URL or endpoint
- `429 Too Many Requests` → Rate limit exceeded
- `500 Internal Server Error` → Server-side error

---

### Step 2: Enable Debug Mode

**In N8N:**
```
Settings → Logging → Set to "debug"
```

**In Browser Console:**
```javascript
// Add to .env.local
VITE_DEBUG=true
```

**In Firebase:**
```bash
firebase functions:log --level DEBUG
```

---

### Step 3: Test Individual Nodes

**Manual Node Execution:**
1. Open workflow in N8N
2. Click node you want to test
3. Click "Execute Node"
4. Check output

**Expected:** Node executes and shows output data
**If fails:** Check credentials, input data, node configuration

---

### Step 4: Check Environment Variables

```
N8N Dashboard → Settings → Environment Variables
```

**Verify:**
- All required variables set
- No typos in variable names
- Values are correct (no extra spaces, quotes)

**Required Variables:**
```env
GOOGLE_SHEETS_ID=your_sheet_id
TIKTOK_ACCESS_TOKEN=your_token
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
GEMINI_API_KEY=your_key
```

---

### Step 5: Check Firebase Function Health

**Test All Functions:**
```bash
# Test each function
curl https://us-central1-freeflow-media.cloudfunctions.net/notifyNewLead
curl https://us-central1-freeflow-media.cloudfunctions.net/sendLeadConfirmationEmail
curl https://us-central1-freeflow-media.cloudfunctions.net/generateOutreachEmail
curl https://us-central1-freeflow-media.cloudfunctions.net/getScheduledPosts
curl https://us-central1-freeflow-media.cloudfunctions.net/getWhatsAppPromos
curl https://us-central1-freeflow-media.cloudfunctions.net/n8nWebhookHandler
```

**Expected:** All return JSON (not HTML error pages)

**If function returns HTML:**
- Function not deployed
- Wrong URL
- Firebase project misconfigured

---

## ⚠️ Critical Issues

### Issue: N8N Instance Down

**Impact:** All N8N workflows fail

**Solution:**
1. **Self-hosted:**
   ```bash
   # Restart N8N
   docker restart n8n
   
   # Check logs
   docker logs n8n --tail 100
   ```

2. **Cloud:**
   - Check N8N status page: https://status.n8n.cloud/
   - Contact N8N support if outage

3. **Fallback:**
   - Firebase continues working (Firebase-first architecture)
   - Leads still saved, notifications still sent
   - N8N is optional enhancement

---

### Issue: Firebase Functions Down

**Impact:** N8N can't notify team or fetch data

**Solution:**
1. **Check Firebase Status:**
   ```bash
   firebase functions:log
   ```

2. **Redeploy Functions:**
   ```bash
   firebase deploy --only functions
   ```

3. **Check Billing:**
   - Firebase may disable functions if billing disabled
   - Enable billing in Firebase Console

---

### Issue: Credentials Expired

**Impact:** Workflow nodes fail with "Unauthorized" errors

**Solution:**
1. **Identify expired credential:**
   - Check which node fails
   - Check credential type

2. **Refresh credential:**
   - Delete old credential in N8N
   - Create new credential
   - Re-authorize with service

3. **Common refresh cycles:**
   - Facebook Graph API: 60 days
   - TikTok API: 24 hours to 30 days
   - WhatsApp API: Varies
   - Google OAuth: 7 days to 1 year

---

## 📊 Error Code Reference

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `ECONNREFUSED` | Connection refused | Service not running, check URL |
| `ETIMEDOUT` | Connection timeout | Service slow/unreachable, increase timeout |
| `400 Bad Request` | Invalid request | Check request body, headers |
| `401 Unauthorized` | Invalid credentials | Refresh credentials |
| `403 Forbidden` | No permission | Check API permissions |
| `404 Not Found` | Invalid URL | Check URL, endpoint exists |
| `429 Too Many Requests` | Rate limit | Wait, or upgrade plan |
| `500 Internal Server Error` | Server error | Check server logs |
| `502 Bad Gateway` | Service unavailable | Service down, retry later |
| `503 Service Unavailable` | Service down | Service down, retry later |

---

## 🔗 Related Resources

- [[N8N-13-Testing-Guide|Testing Guide]]
- [[N8N-08-Credential-Setup|Credential Setup]]
- [[N8N-09-Firebase-Bidirectional-Integration|Firebase Integration]]
- [[07-Deployment-Guide|Deployment Guide]]

---

**Last updated:** 2026-04-13
**Version:** 2.0
**Maintainer:** Drift Studio Team
