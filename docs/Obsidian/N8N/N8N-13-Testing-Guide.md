---
tags: [n8n, testing, qa, validation, freeflow-media]
created: 2026-04-13
updated: 2026-04-13
aliases: [N8N Testing, Workflow Testing, QA Guide]
---

# 🧪 N8N - Testing Guide

## 📋 Overview

This guide provides **step-by-step testing procedures** for all N8N workflows. Use this to validate workflows work correctly before and after deployment.

---

## 🎯 Testing Strategy

### Test Phases

1. **Unit Testing** - Test individual nodes
2. **Integration Testing** - Test complete workflows
3. **End-to-End Testing** - Test real-world scenarios
4. **Regression Testing** - Test after changes

---

## 📊 Test Checklist Summary

| Workflow | Unit Test | Integration Test | E2E Test | Status |
|----------|-----------|------------------|----------|--------|
| Lead Processing | ✅ Below | ✅ Below | ✅ Below | ⬜ Not Tested |
| Social Media Posting | ✅ Below | ✅ Below | ✅ Below | ⬜ Not Tested |
| Social Media Engagement | ✅ Below | ✅ Below | ✅ Below | ⬜ Not Tested |
| WhatsApp Business | ✅ Below | ✅ Below | ✅ Below | ⬜ Not Tested |
| Daily Promo Schedule | ✅ Below | ✅ Below | ✅ Below | ⬜ Not Tested |

---

## 1️⃣ Lead Processing Workflow

### Unit Tests

**Test 1.1: Webhook Receives Data**

**Objective:** Verify webhook receives contact form data correctly

**Steps:**
1. Open workflow in N8N
2. Click "Website Form Webhook" node
3. Click "Listen for Test Event"
4. In new terminal, send test request:
   ```bash
   curl -X POST http://localhost:5678/webhook-test/freeflow-lead \
     -H "Content-Type: application/json" \
     -d '{
       "body": {
         "business_name": "Test Coffee Shop",
         "email": "owner@testcoffee.com",
         "phone": "+27123456789",
         "notes": "Interested in social media management",
         "source": "contact_form"
       }
     }'
   ```

**Expected Result:**
- Webhook node shows received data
- Output: JSON with body, query, headers

**Pass/Fail:**
- ✅ Data received correctly
- ❌ Data missing or malformed

---

**Test 1.2: Google Sheets Backup**

**Objective:** Verify lead data saved to Google Sheets

**Steps:**
1. Click "Backup to Google Sheets" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: Success
- Output: Row ID or updated data

**Verify in Google Sheets:**
1. Open your Google Sheet
2. Go to "Leads" tab
3. Check new row appears with test data

**Pass/Fail:**
- ✅ Data appears in sheet
- ❌ Error or data missing

---

**Test 1.3: Multi-Platform Notification**

**Objective:** Verify notifications sent to Slack/Discord/Telegram/Email

**Steps:**
1. Click "Multi-Platform Notification" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: Success response from Firebase function

**Verify in Platforms:**
- **Slack:** Check #leads channel for notification
- **Discord:** Check #leads channel for notification
- **Email:** Check inbox for notification

**Pass/Fail:**
- ✅ Notifications received
- ❌ No notifications or errors

---

**Test 1.4: Confirmation Email**

**Objective:** Verify confirmation email sent to lead

**Steps:**
1. Click "Send Confirmation Email" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: Email sent confirmation

**Verify:**
- Check email inbox (test email address)
- Should receive confirmation email

**Pass/Fail:**
- ✅ Email received
- ❌ Email not received or error

---

**Test 1.5: AI Email Generation**

**Objective:** Verify AI generates personalized outreach email

**Steps:**
1. Click "AI Email Generator" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: Success
- Output: AI-generated email text (150-200 words)

**Verify Email Quality:**
- References business name
- Professional tone
- Includes CTA
- Under 200 words

**Pass/Fail:**
- ✅ Email generated, good quality
- ❌ Error or poor quality

---

**Test 1.6: AI Email via Firebase (Fallback)**

**Objective:** Verify Firebase fallback works if Gemini fails

**Steps:**
1. Click "AI Email via Firebase" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: AI-generated email from Firebase function

**Pass/Fail:**
- ✅ Firebase generates email
- ❌ Error or Firebase function down

---

### Integration Test

**Test 1.7: Complete Lead Processing Flow**

**Objective:** Verify entire workflow executes end-to-end

**Steps:**
1. Activate workflow (toggle "Active" ON)
2. Submit contact form on website
3. Monitor execution in N8N dashboard

**Expected Flow:**
```
Webhook → Google Sheets → Notifications → Email → AI Email
```

**Verify:**
1. N8N execution shows all nodes green
2. Lead appears in Google Sheets
3. Notifications received (Slack/Discord/Telegram)
4. Confirmation email received
5. AI email generated
6. Firebase lead status updated to "contacted"

**Pass/Fail:**
- ✅ All steps succeed
- ❌ Any step fails

---

### End-to-End Test

**Test 1.8: Real Contact Form Submission**

**Objective:** Test real user journey from contact form to AI email

**Steps:**
1. Open website: `http://localhost:5173`
2. Click "Contact Us"
3. Fill form with real data:
   - Business name: Your test business
   - Email: Your email
   - Phone: Your phone
   - Message: Test message
4. Submit form
5. Wait 30 seconds

**Verify:**
- ✅ Lead saved to Firebase Firestore
- ✅ Lead backed up to Google Sheets
- ✅ Team notified (Slack/Discord/Telegram/Email)
- ✅ Confirmation email received
- ✅ AI outreach email generated
- ✅ Lead status updated to "contacted"

**Check Firebase:**
```bash
firebase functions:log --only notifyNewLead
firebase functions:log --only n8nWebhookHandler
```

**Check Firestore:**
```
Firebase Console → Firestore → leads collection → Check lead document
```

**Pass/Fail:**
- ✅ All verifications pass
- ❌ Any verification fails

---

## 2️⃣ Social Media Posting Workflow

### Unit Tests

**Test 2.1: Schedule Trigger**

**Objective:** Verify schedule trigger fires at correct time

**Steps:**
1. Click "Social Media Post Schedule" node
2. Check trigger time: Daily at 9:00 AM
3. For testing, change to "Every Minute" temporarily
4. Save and wait 1 minute

**Expected Result:**
- Workflow triggers automatically
- Execution appears in N8N dashboard

**Pass/Fail:**
- ✅ Triggers at correct time
- ❌ Doesn't trigger or wrong time

---

**Test 2.2: Fetch Scheduled Posts**

**Objective:** Verify posts fetched from Firebase

**Steps:**
1. Click "Fetch Scheduled Posts" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: Array of posts to publish

**If Empty:**
- Add test post to Firestore:
  ```
  Firebase Console → Firestore → scheduledPosts collection → Add document
  ```
  ```json
  {
    "caption": "Test post from Firebase",
    "mediaUrl": "https://example.com/test-image.jpg",
    "scheduledDate": "2026-04-13T09:00:00",
    "published": false
  }
  ```

**Pass/Fail:**
- ✅ Posts fetched
- ❌ Empty or error

---

**Test 2.3: Post to Instagram**

**Objective:** Verify post published to Instagram

**Steps:**
1. Click "Post to Instagram" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: Success
- Output: Instagram post ID

**Verify:**
- Check Instagram account
- Post should appear

**Pass/Fail:**
- ✅ Post appears on Instagram
- ❌ Error or post not published

---

**Test 2.4: Post to Facebook**

**Objective:** Verify post published to Facebook Page

**Steps:**
1. Click "Post to Facebook" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: Success
- Output: Facebook post ID

**Verify:**
- Check Facebook Page
- Post should appear

**Pass/Fail:**
- ✅ Post appears on Facebook
- ❌ Error or post not published

---

**Test 2.5: Post to TikTok**

**Objective:** Verify video published to TikTok

**Steps:**
1. Click "Post to TikTok" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: TikTok publish session ID

**Verify:**
- Check TikTok account
- Video should appear (may take few minutes)

**Pass/Fail:**
- ✅ Video appears on TikTok
- ❌ Error or video not published

---

### Integration Test

**Test 2.6: Complete Social Posting Flow**

**Objective:** Verify posts published to all platforms

**Steps:**
1. Add test post to Firestore (see Test 2.2)
2. Activate workflow
3. Wait for schedule trigger (or change to "Every Minute")
4. Monitor execution

**Expected Flow:**
```
Schedule → Fetch Posts → Instagram + Facebook + TikTok (parallel)
```

**Verify:**
- ✅ Post appears on Instagram
- ✅ Post appears on Facebook
- ✅ Post appears on TikTok
- ✅ All nodes succeed

**Pass/Fail:**
- ✅ All platforms receive post
- ❌ Any platform fails

---

## 3️⃣ Social Media Engagement Workflow

### Unit Tests

**Test 3.1: Social Inbox Webhook**

**Objective:** Verify webhook receives DM/comment data

**Steps:**
1. Click "Social Media Inbox Webhook" node
2. Click "Listen for Test Event"
3. Send test request:
   ```bash
   curl -X POST http://localhost:5678/webhook-test/social-media-inbox \
     -H "Content-Type: application/json" \
     -d '{
       "platform": "instagram",
       "type": "dm",
       "from_user": "test_user",
       "message": "Hi, interested in your services",
       "conversation_id": "test_conv_123"
     }'
   ```

**Expected Result:**
- Webhook receives data
- Output: JSON with message data

**Pass/Fail:**
- ✅ Data received correctly
- ❌ Data missing or malformed

---

**Test 3.2: AI Response Generation**

**Objective:** Verify AI generates professional response

**Steps:**
1. Click "AI Response Generator" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: Success
- Output: AI-generated response (under 100 words, professional, with emoji)

**Verify Response Quality:**
- Professional tone
- Addresses inquiry
- Includes CTA if sales inquiry
- Under 100 words
- Signs off with "- Drift Studio Team"

**Pass/Fail:**
- ✅ Response generated, good quality
- ❌ Error or poor quality

---

**Test 3.3: Reply to Instagram DM**

**Objective:** Verify reply sent to Instagram DM

**Steps:**
1. Click "Reply to Instagram DM" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: Success
- Output: Message sent confirmation

**Verify:**
- Check Instagram DMs
- Reply should appear in conversation

**Pass/Fail:**
- ✅ Reply sent successfully
- ❌ Error or reply not sent

---

**Test 3.4: Reply to Facebook/Instagram Comment**

**Objective:** Verify reply posted to comment

**Steps:**
1. Click "Reply to Facebook/Instagram Comment" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: Success
- Output: Comment reply posted

**Verify:**
- Check Facebook/Instagram post comments
- Reply should appear

**Pass/Fail:**
- ✅ Reply posted
- ❌ Error or reply not posted

---

### Integration Test

**Test 3.5: Complete Engagement Flow**

**Objective:** Verify DM received, AI responds, reply sent

**Steps:**
1. Activate workflow
2. Send DM to Instagram account (or trigger webhook manually)
3. Monitor execution

**Expected Flow:**
```
Webhook → AI Response → Reply to DM/Comment
```

**Verify:**
- ✅ DM received
- ✅ AI generated response
- ✅ Reply sent automatically

**Pass/Fail:**
- ✅ Complete flow succeeds
- ❌ Any step fails

---

## 4️⃣ WhatsApp Business Workflow

### Unit Tests

**Test 4.1: WhatsApp Webhook**

**Objective:** Verify webhook receives WhatsApp messages

**Steps:**
1. Click "WhatsApp Webhook" node
2. Click "Listen for Test Event"
3. Send test request:
   ```bash
   curl -X POST http://localhost:5678/webhook-test/whatsapp-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "from": "+27123456789",
       "customer_name": "Test Customer",
       "message": "Hi, interested in your products"
     }'
   ```

**Expected Result:**
- Webhook receives data
- Output: JSON with message data

**Pass/Fail:**
- ✅ Data received correctly
- ❌ Data missing or malformed

---

**Test 4.2: Send Promo Template**

**Objective:** Verify promotional template sent via WhatsApp

**Steps:**
1. Click "Send WhatsApp Promo Template" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: Message sent with message ID

**Verify:**
- Check WhatsApp on test phone
- Should receive template message

**Pass/Fail:**
- ✅ Template received
- ❌ Error or message not received

---

**Test 4.3: Send Product Image**

**Objective:** Verify product image sent via WhatsApp

**Steps:**
1. Click "Send WhatsApp Product Image" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: Image message sent

**Verify:**
- Check WhatsApp on test phone
- Should receive image with caption

**Pass/Fail:**
- ✅ Image received
- ❌ Error or image not received

---

**Test 4.4: Send Audio**

**Objective:** Verify audio sent via WhatsApp

**Steps:**
1. Click "Send WhatsApp Audio" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: Audio message sent

**Verify:**
- Check WhatsApp on test phone
- Should receive audio clip

**Pass/Fail:**
- ✅ Audio received
- ❌ Error or audio not received

---

**Test 4.5: Send PDF**

**Objective:** Verify product spec PDF sent via WhatsApp

**Steps:**
1. Click "Send WhatsApp Product Specs (PDF)" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: Document message sent

**Verify:**
- Check WhatsApp on test phone
- Should receive PDF with caption

**Pass/Fail:**
- ✅ PDF received
- ❌ Error or PDF not received

---

### Integration Test

**Test 4.6: Complete WhatsApp Flow**

**Objective:** Verify message received and response sent

**Steps:**
1. Activate workflow
2. Send WhatsApp message to business number
3. Monitor execution

**Expected Flow:**
```
Webhook → Promo Template / Image / Audio / PDF
```

**Verify:**
- ✅ Message received
- ✅ Response sent (template/image/audio/PDF)

**Pass/Fail:**
- ✅ Complete flow succeeds
- ❌ Any step fails

---

## 5️⃣ Daily Promo Schedule Workflow

### Unit Tests

**Test 5.1: Daily Promo Schedule Trigger**

**Objective:** Verify schedule trigger fires at correct time

**Steps:**
1. Click "Daily Promo Schedule" node
2. Check trigger time: Daily at 9:00 AM
3. For testing, change to "Every Minute" temporarily
4. Save and wait 1 minute

**Expected Result:**
- Workflow triggers automatically
- Execution appears in N8N dashboard

**Pass/Fail:**
- ✅ Triggers at correct time
- ❌ Doesn't trigger or wrong time

---

**Test 5.2: Fetch Daily Promos**

**Objective:** Verify promotional content fetched from Firebase

**Steps:**
1. Click "Fetch Daily Promos" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: Array of promotional content

**If Empty:**
- Add test promo to Firestore:
  ```
  Firebase Console → Firestore → whatsappPromos collection → Add document
  ```
  ```json
  {
    "customer_phone": "+27123456789",
    "template_name": "product_promo",
    "template_variables": [...],
    "scheduledDate": "2026-04-13T09:00:00",
    "sent": false
  }
  ```

**Pass/Fail:**
- ✅ Promos fetched
- ❌ Empty or error

---

**Test 5.3: Send Scheduled WhatsApp Promo**

**Objective:** Verify promotional message sent via WhatsApp

**Steps:**
1. Click "Send Scheduled WhatsApp Promo" node
2. Click "Execute Node"
3. Check output

**Expected Result:**
- Status: 200 OK
- Output: Message sent with message ID

**Verify:**
- Check WhatsApp on test phone
- Should receive promotional message

**Pass/Fail:**
- ✅ Promo received
- ❌ Error or promo not received

---

### Integration Test

**Test 5.4: Complete Daily Promo Flow**

**Objective:** Verify promos fetched and sent automatically

**Steps:**
1. Add test promo to Firestore (see Test 5.2)
2. Activate workflow
3. Wait for schedule trigger (or change to "Every Minute")
4. Monitor execution

**Expected Flow:**
```
Schedule → Fetch Promos → Send WhatsApp Promo
```

**Verify:**
- ✅ Promo fetched from Firebase
- ✅ Promo sent via WhatsApp
- ✅ All nodes succeed

**Pass/Fail:**
- ✅ Complete flow succeeds
- ❌ Any step fails

---

## 🔄 Regression Testing

### After Changes

**Test R.1: Lead Processing Still Works**
- Run Test 1.8 (E2E Lead Processing)
- Should pass as before

**Test R.2: Credentials Still Valid**
- Run credential tests from [[N8N-08-Credential-Setup|Credential Setup]]
- All should pass

**Test R.3: Firebase Integration Still Works**
- Check Firebase logs
- Check Firestore updates
- Should work as before

---

## 📊 Test Results Template

Use this template to record test results:

```markdown
## Test Results - [Date]

### Lead Processing
- Test 1.1: ✅ Pass / ❌ Fail - [Notes]
- Test 1.2: ✅ Pass / ❌ Fail - [Notes]
- ...

### Social Media Posting
- Test 2.1: ✅ Pass / ❌ Fail - [Notes]
- ...

### Issues Found
1. [Issue description]
   - Test: [Test number]
   - Severity: [High/Medium/Low]
   - Status: [Open/Fixed]

### Summary
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Pass Rate: [X]%
```

---

## 🚀 Automated Testing (Future)

### Cypress E2E Tests

```javascript
describe('N8N Lead Processing', () => {
  it('should process contact form submission', () => {
    cy.visit('http://localhost:5173');
    cy.get('[data-testid="contact-button"]').click();
    cy.get('[data-testid="business-name"]').type('Test Business');
    cy.get('[data-testid="email"]').type('test@example.com');
    cy.get('[data-testid="phone"]').type('+1234567890');
    cy.get('[data-testid="notes"]').type('Test lead');
    cy.get('[data-testid="submit"]').click();
    
    // Wait for N8N processing
    cy.wait(5000);
    
    // Verify in Firebase
    cy.request('GET', '/api/leads').then((response) => {
      expect(response.body).to.have.length.greaterThan(0);
    });
  });
});
```

---

## 🔗 Related Resources

- [[N8N-12-Troubleshooting|Troubleshooting Guide]]
- [[N8N-08-Credential-Setup|Credential Setup]]
- [[N8N-02-Complete-Workflow-Overview|Workflow Overview]]

---

**Last updated:** 2026-04-13
**Version:** 2.0
**Maintainer:** Drift Studio Team
