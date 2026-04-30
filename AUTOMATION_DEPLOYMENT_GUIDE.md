# 🚀 FREEFLOW MEDIA - COMPLETE DEPLOYMENT GUIDE

This guide will walk you through deploying all automations and fixes for Drift Studio.

---

## ✅ WHAT'S BEEN FIXED & ADDED

### 1. **Contact Form → Firebase (CRITICAL FIX)** ✅
- **Problem:** Contact form was sending to localhost:5678 (not running)
- **Solution:** Now saves directly to Firebase Firestore first, then optionally tries n8n
- **Files Changed:**
  - `src/components/ContactModal.jsx`
  - `firestore.rules` (allow public writes for contact form)
- **Status:** ✅ Works immediately, no setup needed

### 2. **Export Strategy as Document** ✅
- **Problem:** "Export as Google Doc" button was non-functional
- **Solution:** Downloads beautifully formatted HTML document (can be copied to Google Docs)
- **Files Changed:**
  - `src/components/StrategyDashboard.jsx`
  - `src/services/strategyService.js` (new)
- **Status:** ✅ Works immediately

### 3. **Strategy History & Analytics** ✅
- **New Feature:** All generated strategies are now saved to Firebase
- **Files Changed:**
  - `src/pages/MarketingGenerator.jsx`
  - `src/services/strategyService.js` (new)
- **Status:** ✅ Works immediately

### 4. **Firebase Cloud Functions (Complete Suite)** 📝
- **12 Functions Created:**
  1. `generateStrategy` - AI-powered marketing strategy generation
  2. `notifyNewLead` - Slack notification for new leads
  3. `sendLeadConfirmationEmail` - Automated email to leads
  4. `generateOutreachEmail` - AI-generated personalized outreach
  5. `deliverStrategyViaEmail` - Email strategy results to user
  6. `weeklyContentDigest` - Scheduled weekly content ideas
  7. `requestTestimonial` - Automated testimonial/review requests
  8. `handlePaymentWebhook` - Yoco payment processing
  9. `checkAbandonedPayments` - Abandoned cart recovery (every 2 hours)
  10. `enrichLeadData` - Apify website scraping
  11. `scheduleSocialPost` - Buffer/Hootsuite integration
  12. `n8nWebhookHandler` - Receive events from n8n

- **Files Created:**
  - `functions/index.js`
- **Status:** 📝 Needs deployment (see below)

### 5. **N8N Workflow (Enhanced)** 📝
- **Problem:** Workflow had placeholders, localhost URLs, inactive
- **Solution:** Production-ready workflow with Firebase integration
- **Files Changed:**
  - `n8n-marketing-workflow.json`
- **Status:** 📝 Needs n8n instance setup

---

## 🚀 DEPLOYMENT STEPS (IN ORDER)

### PHASE 1: IMMEDIATE (Works Now) ✅

These changes work immediately without any setup:

1. ✅ Contact form saves to Firebase
2. ✅ Strategy export as HTML document
3. ✅ Strategy history tracking
4. ✅ Lead management in Firestore

**Test it:**
```bash
npm run dev
```
Visit `http://localhost:5173` and test:
- Contact form submission
- Content Ideator generation
- Strategy export button

---

### PHASE 2: FIREBASE CLOUD FUNCTIONS (15 mins)

#### Step 1: Initialize Firebase Functions
```bash
cd /Volumes/Ahmed's\ Drive/Antigravity/freeflow-media
firebase init functions
```
Select:
- JavaScript
- ESLint: No
- Install dependencies: Yes

#### Step 2: Install Required Packages
```bash
cd functions
npm install @google/genai cors nodemailer @sendgrid/mail axios
cd ..
```

#### Step 3: Set Firebase Secrets
```bash
# Get your Gemini API key from https://aistudio.google.com/app/apikey
firebase functions:secrets:set GEMINI_API_KEY

# Get SendGrid API key from https://app.sendgrid.com/settings/api_keys
firebase functions:secrets:set SENDGRID_API_KEY

# Create Slack webhook: https://api.slack.com/messaging/webhooks
firebase functions:secrets:set SLACK_WEBHOOK_URL

# Your existing Apify API key
firebase functions:secrets:set APIFY_API_KEY
```

#### Step 4: Update functions/package.json
Make sure it includes:
```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "@google/genai": "^0.1.0",
    "cors": "^2.8.5",
    "@sendgrid/mail": "^8.1.0",
    "axios": "^1.6.0"
  }
}
```

#### Step 5: Deploy Functions
```bash
firebase deploy --only functions
```

**Expected output:**
```
✔ Deploy complete!

Function URL (generateStrategy): https://us-central1-freeflow-media.cloudfunctions.net/generateStrategy
Function URL (notifyNewLead): https://us-central1-freeflow-media.cloudfunctions.net/notifyNewLead
... (12 functions total)
```

#### Step 6: Test Functions
```bash
# Test strategy generation
curl -X POST https://us-central1-freeflow-media.cloudfunctions.net/generateStrategy \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "Coffee Shop",
    "targetAudience": "Young professionals",
    "businessCountry": "South Africa"
  }'
```

---

### PHASE 3: EMAIL SETUP (10 mins)

#### Option A: SendGrid (Recommended)

1. **Create SendGrid Account**
   - Visit: https://app.sendgrid.com/
   - Sign up for free tier (100 emails/day)

2. **Create API Key**
   - Settings → API Keys → Create API Key
   - Full Access
   - Copy the key

3. **Set as Firebase Secret** (already done above)
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY
   ```

4. **Verify Sender Email**
   - Settings → Sender Authentication
   - Verify `contact@freeflowmedia.com` or your domain

#### Option B: EmailJS (Already Integrated)

1. **Create EmailJS Account**
   - Visit: https://www.emailjs.com/
   - Free tier: 200 emails/month

2. **Add Email Service**
   - Email Services → Add New Service
   - Connect your Gmail

3. **Create Email Template**
   - Email Templates → Create New Template
   - Variables: `{{from_name}}`, `{{from_email}}`, `{{phone}}`, `{{message}}`

4. **Update .env.local**
   ```env
   VITE_EMAILJS_SERVICE_ID=service_xxxxxx
   VITE_EMAILJS_TEMPLATE_ID=template_xxxxxx
   VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxx
   ```

---

### PHASE 4: SLACK NOTIFICATIONS (5 mins)

1. **Create Slack Workspace** (if you don't have one)
   - Visit: https://slack.com/

2. **Create Incoming Webhook**
   - Go to: https://api.slack.com/messaging/webhooks
   - Add to Slack → Choose channel (#leads or #general)
   - Copy Webhook URL

3. **Set as Firebase Secret** (already done above)
   ```bash
   firebase functions:secrets:set SLACK_WEBHOOK_URL
   ```

4. **Test Notification**
   - Submit a lead via contact form
   - You should see a message in Slack within seconds

---

### PHASE 5: N8N SETUP (Optional - 30 mins)

#### Option A: Self-Hosted (Free)

1. **Install Docker** (if not installed)
   ```bash
   # macOS
   brew install --cask docker
   ```

2. **Run n8n**
   ```bash
   docker run -it --rm \
     --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     -e GENERIC_TIMEZONE=Africa/Johannesburg \
     n8nio/n8n
   ```

3. **Access n8n**
   - Visit: http://localhost:5678
   - Set up admin account

4. **Import Workflow**
   - Settings → Import → Select `n8n-marketing-workflow.json`

5. **Configure Credentials**
   - Google Sheets OAuth
   - Google Gemini API
   - SMTP (for emails)

6. **Activate Workflow**
   - Toggle "Active" to ON

#### Option B: n8n Cloud (Paid, Easier)

1. **Sign Up**
   - Visit: https://n8n.io/pricing
   - Starter plan: $20/month

2. **Import Workflow**
   - Same as above

3. **Update Webhook URL**
   - Change `VITE_N8N_WEBHOOK_URL` in `.env.local` to your production URL

---

### PHASE 6: DEPLOY TO PRODUCTION (5 mins)

#### Option A: Firebase Hosting

```bash
# Build production version
npm run build

# Deploy to Firebase
firebase deploy

# Or use the deploy script
./deploy.sh
```

Your site will be live at: `https://freeflow-media.web.app`

#### Option B: Custom Domain

1. **Add Domain to Firebase**
   ```bash
   firebase hosting:channel:deploy custom-domain
   ```

2. **Follow DNS Instructions**
   - Update your domain's DNS records
   - Wait for propagation (up to 48 hours)

---

## 🧪 TESTING CHECKLIST

### Contact Form
- [ ] Submit contact form with valid data
- [ ] Verify lead appears in Firebase Firestore (`leads` collection)
- [ ] Check Slack for notification (if configured)
- [ ] Verify confirmation email received (if SendGrid configured)

### Content Ideator
- [ ] Fill out business info form
- [ ] Complete payment (or use promo code 'family')
- [ ] Wait for strategy generation
- [ ] Verify strategy dashboard displays
- [ ] Click "Export as Document" - should download HTML
- [ ] Verify strategy saved to Firestore (`strategies` collection)
- [ ] Click "Email" - should open mail client

### Automations (After Firebase Functions Deployed)
- [ ] Submit contact form → Check Slack notification
- [ ] Submit contact form → Check confirmation email
- [ ] Generate strategy → Check strategy saved to Firestore
- [ ] Generate strategy → Check strategy delivery email (if email provided)
- [ ] Wait 2 hours → Check abandoned cart emails (if payment started but not completed)
- [ ] Wait for Monday 9 AM → Check weekly content digest

---

## 📊 MONITORING & ANALYTICS

### View Leads in Firestore
```bash
firebase open firestore
```
Navigate to `leads` collection

### View Strategies
Navigate to `strategies` collection

### View Function Logs
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only generateStrategy
```

### View Analytics
```bash
firebase open analytics
```

---

## 🔧 TROUBLESHOOTING

### Contact Form Not Saving
1. Check browser console for errors
2. Verify Firestore rules are deployed:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Check Firestore logs

### Strategy Generation Fails
1. Check Firebase Function logs:
   ```bash
   firebase functions:log --only generateStrategy
   ```
2. Verify GEMINI_API_KEY is set:
   ```bash
   firebase functions:secrets:access GEMINI_API_KEY
   ```
3. Check billing is enabled on Firebase (required for external API calls)

### Emails Not Sending
1. Verify SendGrid API key:
   ```bash
   firebase functions:secrets:access SENDGRID_API_KEY
   ```
2. Check sender email is verified in SendGrid
3. Check SendGrid activity dashboard

### Slack Notifications Not Working
1. Verify webhook URL:
   ```bash
   firebase functions:secrets:access SLACK_WEBHOOK_URL
   ```
2. Test webhook manually:
   ```bash
   curl -X POST YOUR_SLACK_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"text": "Test message"}'
   ```

### N8N Workflow Not Triggering
1. Verify webhook URL is production URL (not localhost)
2. Check n8n is running and accessible
3. Check n8n execution logs

---

## 📈 NEXT STEPS (After Deployment)

### 1. Add User Authentication
Let users create accounts and view their strategy history

### 2. Implement Real Yoco Integration
Replace mock payment with actual Yoco SDK

### 3. Build Admin Dashboard
View all leads, strategies, payments, and analytics

### 4. Add Social Media Scheduling
Integrate Buffer/Hootsuite API for auto-posting

### 5. Create Mobile App
React Native app for Content Ideator

### 6. Implement AI Chatbot
Answer visitor questions using Gemini

---

## 🎯 ARCHITECTURE OVERVIEW

```
┌──────────────────────────────────────────────────────────┐
│                   Drift Studio Website                 │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Contact Form│  │ Content      │  │ Admin Panel     │ │
│  │             │  │ Ideator      │  │ (Future)        │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────────────┘ │
│         │                │                                │
└─────────┼────────────────┼────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                    Firebase Platform                     │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Firestore   │  │ Cloud        │  │ Storage         │ │
│  │ (Leads,     │  │ Functions    │  │ (File Uploads)  │ │
│  │ Strategies) │  │ (12 funcs)   │  │                 │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────────────┘ │
│         │                │                                │
└─────────┼────────────────┼────────────────────────────────┘
          │                │
          │                ▼
          │         ┌──────────────┐
          │         │ External APIs│
          │         │ - SendGrid   │
          │         │ - Slack      │
          │         │ - Gemini AI  │
          │         │ - Apify      │
          │         │ - Yoco       │
          │         └──────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│              Optional: N8N Automation                     │
│                                                          │
│  Webhook → Google Sheets → AI Email → Send → Slack      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 COST BREAKDOWN

| Service | Free Tier | Paid Plan |
|---------|-----------|-----------|
| Firebase (Spark) | 50K reads/day, 20K writes/day | $0.06/100K reads |
| Firebase Functions | 2M invocations/month | $0.40/million after |
| SendGrid | 100 emails/day | $15/month for 40K |
| Slack | Free | $7.25/user/month |
| n8n (self-hosted) | Free | - |
| n8n Cloud | - | $20/month |
| Gemini AI | Free tier available | $0.00025/1K tokens |
| Apify | $5 free credit/month | $49/month |
| **TOTAL (Minimum)** | **$0** | - |
| **TOTAL (Recommended)** | - | **~$35-85/month** |

---

## 📞 SUPPORT

If you encounter issues:

1. Check the troubleshooting section above
2. Review Firebase logs: `firebase functions:log`
3. Check browser console for frontend errors
4. Review Firestore security rules
5. Verify all API keys are set correctly

---

## ✅ DEPLOYMENT COMPLETE CHECKLIST

- [ ] Contact form saves to Firebase ✅
- [ ] Strategy export works ✅
- [ ] Firebase Functions deployed
- [ ] SendGrid configured
- [ ] Slack notifications working
- [ ] N8N workflow active (optional)
- [ ] Production deployment live
- [ ] All tests passing
- [ ] Monitoring set up

**🎉 Congratulations! Your automations are live!**
