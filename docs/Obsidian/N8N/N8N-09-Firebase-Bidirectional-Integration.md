---
tags: [n8n, firebase, integration, bidirectional, webhook, freeflow-media]
created: 2026-04-13
updated: 2026-04-13
aliases: [Firebase Integration, Bidirectional Sync, N8N Firebase Communication]
---

# 🔗 N8N - Firebase Bidirectional Integration

## 📋 Overview

This document explains how **N8N and Firebase communicate bidirectionally**, creating a powerful hybrid automation system where both platforms complement each other.

---

## 🔄 Bidirectional Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Communication Flow                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  FIREBASE → N8N                                          │
│  Frontend triggers N8N webhooks                           │
│  automationServices.js → N8N webhook URL                  │
│                                                           │
│  N8N → FIREBASE                                          │
│  N8N sends events back to Firebase Cloud Functions        │
│  HTTP Request node → n8nWebhookHandler                    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 📡 Firebase → N8N Communication

### How It Works

**Step 1: Frontend Calls N8N Webhook**

File: `src/services/automationServices.js`

```javascript
export const triggerN8nWorkflow = async (data, eventType) => {
  const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
  
  if (!N8N_WEBHOOK_URL) {
    console.warn('N8N webhook URL not configured');
    return { success: false, error: 'N8N URL not configured' };
  }

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      eventType,
      timestamp: new Date().toISOString()
    })
  });
  
  return await response.json();
};
```

**Step 2: N8N Receives Webhook**

N8N Workflow Node: **Website Form Webhook** (or custom webhook node)
- Path: `freeflow-lead` (or your custom path)
- Receives POST request with payload

**Step 3: N8N Processes Data**

N8N workflow executes:
1. Backup to Google Sheets
2. Multi-platform notifications
3. AI email generation
4. Sends events back to Firebase

---

### Event Types Sent to N8N

| Event Type | Triggered By | Data Sent |
|------------|--------------|-----------|
| `lead_created` | Contact form submission | Full lead data (name, email, phone, notes, source) |
| `strategy_delivered` | Strategy email sent | strategyId, userEmail, businessName |
| `testimonial_requested` | Testimonial request | Lead object, daysSinceConversion |

---

### Automation Sequences

**1. New Lead Automation**

```javascript
export const runNewLeadAutomation = async (lead, platforms) => {
  const results = {
    notifications: null,
    email: null,
    aiEmail: null,
    n8n: null
  };

  const promises = [
    triggerMultiPlatformNotification(lead, platforms).then(r => results.notifications = r),
    triggerConfirmationEmail(lead).then(r => results.email = r),
    generateOutreachEmail(lead).then(r => results.aiEmail = r),
    triggerN8nWorkflow(lead, 'lead_created').then(r => results.n8n = r)
  ];

  await Promise.allSettled(promises);
  return results;
};
```

**Flow:**
1. User submits contact form
2. Lead saved to Firebase (guaranteed)
3. Parallel execution:
   - Firebase notifications → Slack/Discord/Telegram/Email
   - Firebase confirmation email → Lead
   - Firebase AI email generation → Outreach email
   - **N8N webhook trigger** → Enhanced automation

**Result:**
- Firebase handles all critical operations
- N8N provides additional enhancements (Google Sheets backup, etc.)

---

**2. Strategy Delivery**

```javascript
export const runStrategyDelivery = async (strategyId, userEmail, businessName) => {
  const results = { email: null, n8n: null };

  const promises = [
    deliverStrategyViaEmail(strategyId, userEmail, businessName).then(r => results.email = r),
    triggerN8nWorkflow({ strategyId, userEmail }, 'strategy_delivered').then(r => results.n8n = r)
  ];

  await Promise.allSettled(promises);
  return results;
};
```

**Flow:**
1. Strategy generated and saved to Firebase
2. Strategy emailed to user (Firebase)
3. **N8N notified** (optional: log to Google Sheets, send Slack notification, etc.)

---

**3. Testimonial Request**

```javascript
export const runTestimonialRequest = async (lead, daysSinceConversion) => {
  const results = { testimonial: null, n8n: null };

  const promises = [
    sendTestimonialRequest(lead, daysSinceConversion).then(r => results.testimonial = r),
    triggerN8nWorkflow({ lead }, 'testimonial_requested').then(r => results.n8n = r)
  ];

  await Promise.allSettled(promises);
  return results;
};
```

**Flow:**
1. Testimonial request email sent (Firebase)
2. **N8N notified** (optional: schedule follow-up reminder, log to CRM, etc.)

---

## 📡 N8N → Firebase Communication

### How It Works

**Step 1: N8N Workflow Executes**

N8N completes workflow actions (e.g., lead processed, email sent)

**Step 2: N8N Sends HTTP Request to Firebase**

N8N Node: **HTTP Request** (in workflow)

```
Method: POST
URL: https://us-central1-freeflow-media.cloudfunctions.net/n8nWebhookHandler
Headers: Content-Type: application/json
Body: {
  "eventType": "lead_created",
  "lead": { ... lead data ... },
  "timestamp": "2026-04-13T..."
}
```

**Step 3: Firebase Cloud Function Receives Event**

File: `functions/index.js`

```javascript
exports.n8nWebhookHandler = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    const { eventType, lead } = req.body;
    
    try {
      switch (eventType) {
        case 'lead_created':
          await handleLeadCreated(lead);
          break;
          
        case 'email_sent':
          await handleEmailSent(lead);
          break;
          
        case 'follow_up_scheduled':
          await handleFollowUpScheduled(lead);
          break;
          
        default:
          console.warn('Unknown event type:', eventType);
          res.status(400).json({ 
            success: false, 
            error: 'Unknown event type' 
          });
          return;
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('n8nWebhookHandler error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);
```

**Step 4: Firebase Updates Firestore**

Depending on event type, Firebase updates lead records:

```javascript
async function handleLeadCreated(lead) {
  await db.collection('leads').doc(lead.id).update({
    status: 'contacted',
    contactedAt: admin.firestore.FieldValue.serverTimestamp(),
    n8nProcessed: true,
    n8nProcessedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function handleEmailSent(lead) {
  await db.collection('leads').doc(lead.id).update({
    emailStatus: 'sent',
    lastEmailSent: admin.firestore.FieldValue.serverTimestamp(),
    lastEmailTemplate: lead.template || 'confirmation'
  });
}

async function handleFollowUpScheduled(lead) {
  await db.collection('leads').doc(lead.id).update({
    followUpDate: lead.followUpDate,
    followUpStatus: 'scheduled',
    followUpType: lead.followUpType || 'email'
  });
}
```

---

### Event Types Sent from N8N

| Event Type | Sent When | Firebase Action |
|------------|-----------|-----------------|
| `lead_created` | N8N processes new lead | Update lead status to "contacted" |
| `email_sent` | N8N sends email | Record email sent timestamp |
| `follow_up_scheduled` | N8N schedules follow-up | Set follow-up date on lead |

---

## 🔁 Complete Communication Cycle

### Example: Lead Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Complete Cycle                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User submits contact form (Website)                     │
│         ↓                                                     │
│  2. Firebase saves lead to Firestore                        │
│         ↓                                                     │
│  3. Firebase sends notifications (Slack/Discord/Email)      │
│         ↓                                                     │
│  4. Frontend triggers N8N webhook                           │
│     (Firebase → N8N)                                        │
│         ↓                                                     │
│  5. N8N receives webhook                                    │
│         ↓                                                     │
│  6. N8N backs up to Google Sheets                           │
│         ↓                                                     │
│  7. N8N generates AI email (Gemini)                         │
│         ↓                                                     │
│  8. N8N sends confirmation email                            │
│         ↓                                                     │
│  9. N8N notifies Firebase of completion                     │
│     (N8N → Firebase)                                        │
│         ↓                                                     │
│  10. Firebase updates lead status to "contacted"            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Synchronization

### What Gets Synced

| Data Type | Firebase → N8N | N8N → Firebase |
|-----------|----------------|----------------|
| Lead data | ✅ Full lead object | ✅ Status updates |
| Email status | ✅ Template info | ✅ Sent timestamp |
| Follow-ups | ✅ Schedule info | ✅ Follow-up date |
| Notifications | ✅ Platform list | ✅ Delivery status |

### Single Source of Truth

**Firebase Firestore is the authoritative source:**
- All leads stored in `leads` collection
- All strategies stored in `strategies` collection
- N8N can read from Firebase (via HTTP requests to Firebase Functions)
- N8N writes back to Firebase (via `n8nWebhookHandler`)
- Admin panel shows Firebase data (single source of truth)

---

## 🔧 Implementation Details

### Frontend Configuration

**Environment Variable:**
```env
VITE_N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook/freeflow-lead
```

**Service Function:**
```javascript
// Located in: src/services/automationServices.js

export const triggerN8nWorkflow = async (data, eventType) => {
  const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
  
  if (!N8N_WEBHOOK_URL) {
    return { success: false, error: 'N8N URL not configured' };
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        eventType,
        timestamp: new Date().toISOString()
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('N8N trigger failed:', error);
    return { success: false, error: error.message };
  }
};
```

**Error Handling:**
- Non-blocking: Wrapped in `Promise.allSettled`
- Graceful degradation: Firebase handles everything if N8N fails
- Logging: Errors logged but don't break flow

---

### N8N Workflow Configuration

**HTTP Request Node (N8N → Firebase):**

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://us-central1-freeflow-media.cloudfunctions.net/n8nWebhookHandler",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "eventType",
          "value": "lead_created"
        },
        {
          "name": "lead",
          "value": "={{ $json.body }}"
        },
        {
          "name": "timestamp",
          "value": "={{ $now.toISOString() }}"
        }
      ]
    },
    "options": {}
  },
  "name": "Notify Firebase",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2
}
```

**Placement in Workflow:**
- Add after "Send Confirmation Email" node
- Ensures Firebase knows N8N completed processing

---

### Firebase Cloud Function

**Function Definition:**

```javascript
// Located in: functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

exports.n8nWebhookHandler = functions.https.onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    const { eventType, lead } = req.body;
    
    try {
      console.log('Received N8N event:', { eventType, leadId: lead?.id });
      
      switch (eventType) {
        case 'lead_created':
          await db.collection('leads').doc(lead.id).update({
            status: 'contacted',
            contactedAt: admin.firestore.FieldValue.serverTimestamp(),
            n8nProcessed: true,
            n8nProcessedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('Lead updated:', lead.id);
          break;
          
        case 'email_sent':
          await db.collection('leads').doc(lead.id).update({
            emailStatus: 'sent',
            lastEmailSent: admin.firestore.FieldValue.serverTimestamp(),
            lastEmailTemplate: lead.template || 'confirmation'
          });
          console.log('Email status updated:', lead.id);
          break;
          
        case 'follow_up_scheduled':
          await db.collection('leads').doc(lead.id).update({
            followUpDate: lead.followUpDate,
            followUpStatus: 'scheduled',
            followUpType: lead.followUpType || 'email'
          });
          console.log('Follow-up scheduled:', lead.id);
          break;
          
        default:
          console.warn('Unknown event type:', eventType);
          res.status(400).json({ 
            success: false, 
            error: 'Unknown event type' 
          });
          return;
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('n8nWebhookHandler error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);
```

**CORS Configuration:**
- `cors: true` allows N8N to call this function
- Accepts requests from any origin (N8N can be self-hosted or cloud)

---

## 🔍 Monitoring & Debugging

### Monitor Firebase → N8N

**Frontend Console:**
```javascript
// Open browser DevTools → Console
// Look for:
console.log('N8N response:', response);  // Success
console.error('N8N trigger failed:', error);  // Failure
```

**N8N Executions:**
```
N8N Dashboard → Executions → Filter by workflow
```
- Green checkmark: Webhook received and processed
- Red X: Webhook received but processing failed

---

### Monitor N8N → Firebase

**N8N Workflow Logs:**
```
N8N Dashboard → Executions → Click execution → Check HTTP Request node
```
- Status 200: Firebase received event
- Status 500: Firebase function error

**Firebase Function Logs:**
```bash
# All logs
firebase functions:log --only n8nWebhookHandler

# Filter by event type
firebase functions:log --only n8nWebhookHandler | grep "lead_created"
```

**Firestore Changes:**
```
Firebase Console → Firestore → leads collection → Check lead document
```
- Look for `n8nProcessed: true`
- Check `contactedAt` timestamp
- Verify `emailStatus: 'sent'`

---

## ⚠️ Important Considerations

### 1. Non-Blocking Design

**Critical:** N8N calls MUST be non-blocking

```javascript
// ✅ CORRECT - Non-blocking
const promises = [
  triggerMultiPlatformNotification(lead, platforms),
  triggerConfirmationEmail(lead),
  triggerN8nWorkflow(lead, 'lead_created')  // Won't block others
];

await Promise.allSettled(promises);  // Waits for all, doesn't fail fast

// ❌ WRONG - Blocking
await triggerN8nWorkflow(lead, 'lead_created');  // Blocks if N8N is slow
await triggerMultiPlatformNotification(lead, platforms);
```

**Why:**
- If N8N is slow or down, entire automation blocks
- Firebase notifications delayed
- User experience degraded

---

### 2. Idempotency

**Firebase handler should be idempotent:**

```javascript
// ✅ Safe to call multiple times
await db.collection('leads').doc(lead.id).update({
  status: 'contacted',
  contactedAt: admin.firestore.FieldValue.serverTimestamp()
});

// If called twice, lead still has correct status
```

**Avoid:**
```javascript
// ❌ Unsafe - creates duplicate records
await db.collection('leads').add({
  ...lead,
  status: 'contacted'
});
```

---

### 3. Error Handling

**Both sides handle errors gracefully:**

**Frontend:**
```javascript
try {
  const result = await triggerN8nWorkflow(data, eventType);
  if (!result.success) {
    console.warn('N8N processing failed:', result.error);
    // Continue anyway - Firebase handled everything
  }
} catch (error) {
  console.error('N8N trigger failed:', error);
  // Don't throw - flow continues
}
```

**Firebase:**
```javascript
try {
  // Process event
  await updateLeadRecord(lead);
  res.json({ success: true });
} catch (error) {
  console.error('Error processing N8N event:', error);
  res.status(500).json({ success: false, error: error.message });
  // Firebase function doesn't crash, just returns error
}
```

---

### 4. Security

**Webhook URL should be kept secret:**

```env
# .env.local (NEVER commit to git)
VITE_N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook/freeflow-lead
```

**Firebase Function should validate requests:**

```javascript
// Optional: Add authentication
exports.n8nWebhookHandler = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    // Validate request origin or API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.N8N_API_KEY) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    
    // Process event...
  }
);
```

---

## 🚀 Advanced Use Cases

### Use Case 1: N8N Reads from Firebase

**N8N Workflow Node:**
```
HTTP Request → GET https://us-central1-freeflow-media.cloudfunctions.net/getScheduledPosts

Returns: Array of posts to publish
```

**Firebase Function:**
```javascript
exports.getScheduledPosts = onRequest(async (req, res) => {
  const now = admin.firestore.Timestamp.now();
  
  const snapshot = await db.collection('scheduledPosts')
    .where('scheduledDate', '<=', now)
    .where('published', '==', false)
    .get();
  
  const posts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  res.json({ success: true, posts });
});
```

---

### Use Case 2: N8N Triggers Firebase AI

**N8N Workflow Node:**
```
HTTP Request → POST https://us-central1-freeflow-media.cloudfunctions.net/generateOutreachEmail

Body: { lead: { ... } }
Returns: AI-generated email
```

**Firebase Function:**
```javascript
exports.generateOutreachEmail = onRequest(async (req, res) => {
  const { lead } = req.body;
  
  // Call Google Gemini
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  
  const prompt = `Write personalized outreach email for ${lead.business_name}...`;
  
  const result = await model.generateContent(prompt);
  const email = result.response.text();
  
  res.json({ success: true, email });
});
```

---

### Use Case 3: Firebase Schedules N8N Follow-ups

**Frontend:**
```javascript
// Schedule follow-up in 3 days
const followUpDate = new Date();
followUpDate.setDate(followUpDate.getDate() + 3);

await triggerN8nWorkflow({
  lead,
  followUpDate,
  followUpType: 'email'
}, 'follow_up_scheduled');
```

**N8N Workflow:**
```
Webhook (receive follow_up_scheduled)
    ↓
Wait (3 days)
    ↓
Send follow-up email
    ↓
Notify Firebase
```

---

## 🔗 Related Resources

- [[N8N-01-Firebase-First-Architecture|Firebase-First Architecture]]
- [[N8N-00-Changes-Index|N8N Changes Index]]
- [[01-Complete-Automation-Overview|Complete Automation Overview]]
- [[07-Deployment-Guide|Deployment Guide]]

---

**Last updated:** 2026-04-13
**Version:** 2.0
**Maintainer:** Drift Studio Team
