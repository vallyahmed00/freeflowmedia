---
tags: [freeflow-media, deployment, firebase, setup]
created: 2026-04-13
updated: 2026-04-13
aliases: [Deployment, Setup Guide, Go Live]
---

# 🚀 Deployment Guide

## 📋 Overview

Complete step-by-step guide to deploy all automations to production.

---

## Phase 1: Pre-Deployment Checklist ✅

### Already Working (No Setup Needed)
- [x] Contact form saves to Firebase
- [x] File uploads to Firebase Storage
- [x] Strategy generation (with mock fallback)
- [x] Price comparison tool (with mock fallback)
- [x] PDF export functionality
- [x] Admin panel with auth protection

### Needs Deployment
- [ ] Firebase Cloud Functions
- [ ] Notification platform webhooks
- [ ] SendGrid email configuration
- [ ] Production testing

---

## Phase 2: Firebase Functions Deployment

### Step 1: Initialize Functions
```bash
cd "/Volumes/Ahmed's Drive /Antigravity/freeflow-media"
firebase init functions
```
Select:
- JavaScript
- ESLint: No
- Install dependencies: Yes

### Step 2: Install Packages
```bash
cd functions
npm install @google/genai cors @sendgrid/mail axios
cd ..
```

### Step 3: Set Firebase Secrets
```bash
# AI Generation
firebase functions:secrets:set GEMINI_API_KEY

# Email Delivery
firebase functions:secrets:set SENDGRID_API_KEY

# Notifications (choose your platforms)
firebase functions:secrets:set DISCORD_WEBHOOK_URL
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID
firebase functions:secrets:set TEAMS_WEBHOOK_URL
firebase functions:secrets:set SLACK_WEBHOOK_URL
```

### Step 4: Update Admin Email
In `functions/index.js`:
- Search for `admin@freeflowmedia.com`
- Replace with your admin email

### Step 5: Deploy Functions
```bash
firebase deploy --only functions
```

Expected output:
```
✔ Deploy complete!

Function URL (generateStrategy): https://us-central1-freeflow-media.cloudfunctions.net/generateStrategy
Function URL (notifyNewLead): https://us-central1-freeflow-media.cloudfunctions.net/notifyNewLead
Function URL (deliverStrategyWithPDF): ...
... (14 functions total)
```

---

## Phase 3: Platform-Specific Setup

### Discord (Recommended)

1. **Create Server & Channel**
   - https://discord.com/ → Add Server
   - Create `#leads` channel

2. **Create Webhook**
   - Channel Settings → Integrations → Webhooks
   - New Webhook → Name: "FreeFlow Bot"
   - Copy Webhook URL

3. **Set Secret**
   ```bash
   firebase functions:secrets:set DISCORD_WEBHOOK_URL
   # Paste webhook URL
   ```

### Telegram

1. **Create Bot**
   - Telegram → Search `@BotFather`
   - Send: `/newbot`
   - Follow prompts
   - Copy Bot Token

2. **Get Chat ID**
   - Search `@userinfobot`
   - Send message
   - Copy Chat ID

3. **Set Secrets**
   ```bash
   firebase functions:secrets:set TELEGRAM_BOT_TOKEN
   firebase functions:secrets:set TELEGRAM_CHAT_ID
   ```

### SendGrid (Email)

1. **Create Account**
   - https://app.sendgrid.com/
   - Free tier: 100 emails/day

2. **Create API Key**
   - Settings → API Keys → Create
   - Full Access
   - Copy key

3. **Verify Sender**
   - Settings → Sender Authentication
   - Verify `contact@freeflowmedia.com`

4. **Set Secret**
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY
   ```

---

## Phase 4: Testing

### Test Contact Form
```bash
npm run dev
# Visit http://localhost:5173
# Submit contact form
# Check:
#   - Discord/Telegram for notification
#   - Firebase Firestore → leads collection
#   - Email inbox for confirmation
```

### Test Strategy Generation
```bash
# Visit /marketing-generator
# Fill form, use promo code 'family'
# Check:
#   - Strategy dashboard appears
#   - Click "Download PDF" → PDF downloads
#   - Click "Email Strategy" → Check inbox
#   - Firebase Firestore → strategies collection
```

### Test Price Comparison
```bash
# Visit /price-comparison
# Fill business info
# Check:
#   - 4-tab dashboard appears
#   - Click "Export Report" → PDF downloads
#   - Firebase Firestore → priceComparisons collection
```

### Test Admin Panel
```bash
# Visit /admin
# Should require login
# Login with Firebase Auth
# Check:
#   - All tabs load (Testimonials, Leads, Strategies, etc.)
#   - Can manage content
```

---

## Phase 5: Production Deployment

### Build Production Version
```bash
npm run build
```

### Deploy to Firebase
```bash
firebase deploy
```

Or use deploy script:
```bash
./deploy.sh
```

### Verify Production
- Visit: https://freeflow-media.web.app
- Test all features
- Check Firebase Console
- Monitor function logs

---

## Phase 6: Post-Deployment Monitoring

### Check Function Logs
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only generateStrategy
```

### Monitor Firestore
- Visit Firebase Console → Firestore
- Check collections:
  - `leads` - New leads appearing
  - `strategies` - Strategies being saved
  - `priceComparisons` - Pricing reports

### Track Usage
```javascript
// In browser console
import { getAnalytics } from 'firebase/analytics';
// Monitor events in Firebase Console → Analytics
```

---

## 🔧 Troubleshooting

### Functions Not Deploying
```bash
# Check Firebase billing
firebase open billing

# Verify secrets are set
firebase functions:secrets:access GEMINI_API_KEY

# Check function logs
firebase functions:log
```

### Emails Not Sending
- Verify SendGrid API key
- Check sender email is verified
- Check SendGrid activity dashboard

### Notifications Not Working
- Test webhook manually:
  ```bash
  curl -X POST YOUR_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{"text": "Test"}'
  ```
- Check webhook URL is correct
- Verify platform is active

### PDF Export Failing
- Check browser console for errors
- Verify jsPDF is installed
- Check strategy data is complete

---

## 📊 Deployment Timeline

| Phase | Time | Status |
|-------|------|--------|
| Pre-deployment checks | 5 mins | ✅ Done |
| Firebase Functions setup | 15 mins | 📝 Todo |
| Platform configuration | 15 mins | 📝 Todo |
| Testing | 15 mins | 📝 Todo |
| Production deployment | 5 mins | 📝 Todo |
| **Total** | **~55 mins** | |

---

## ✅ Post-Deployment Checklist

- [ ] All functions deployed successfully
- [ ] Contact form notifications working
- [ ] Strategy PDF export working
- [ ] Email delivery working
- [ ] Price comparison tool working
- [ ] Admin panel protected
- [ ] Firestore security rules deployed
- [ ] Production site live
- [ ] Monitoring set up
- [ ] Team trained on new features

---

## 📚 Related

- [[01-Complete-Automation-Overview|Automation Overview]]
- [[08-Firebase-Setup|Firebase Setup]]
- [[12-Troubleshooting|Troubleshooting]]

---

**Ready to deploy! 🚀**
