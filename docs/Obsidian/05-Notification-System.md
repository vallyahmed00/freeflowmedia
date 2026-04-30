---
tags: [freeflow-media, notifications, discord, telegram, teams, slack, email]
created: 2026-04-13
updated: 2026-04-13
aliases: [Notifications, Multi-Platform Alerts]
---

# 🔔 Multi-Platform Notification System

## 📋 Overview

Replaced Slack-only notifications with support for **5 platforms**. Choose any combination based on your team's preferences.

---

##  Platform Comparison

| Platform | Setup Time | Cost | Best For | Mobile App |
|----------|------------|------|----------|------------|
| **Discord** ⭐ | 5 mins | Free | Small teams, developers | ✅ Excellent |
| **Telegram** | 10 mins | Free | Mobile-first teams | ✅ Best |
| **Microsoft Teams** | 5 mins | Free | Corporate environments | ✅ Good |
| **Slack** | 5 mins | Free | Teams already using Slack | ✅ Good |
| **Email** | 5 mins | Free (SendGrid) | Universal | ✅ Always works |

---

## 🎯 Recommended Configuration

**For Solo/Small Team:**
```javascript
platforms: ['discord', 'telegram', 'email']
```

**For Corporate:**
```javascript
platforms: ['teams', 'email']
```

**For Maximum Coverage:**
```javascript
platforms: ['slack', 'discord', 'teams', 'telegram', 'email']
```

**Current Setup:** Discord + Telegram + Email

---

## 🔧 Setup Instructions

### Discord (Recommended) ⭐

1. **Create Discord Server**
   - Visit https://discord.com/
   - Click "Add a Server" → "Create My Own"

2. **Create Channel**
   - Right-click text channels → "Create Channel"
   - Name it `#leads` or `#notifications`

3. **Create Webhook**
   - Channel Settings → Integrations → Webhooks
   - Click "New Webhook"
   - Name: "FreeFlow Bot"
   - Copy Webhook URL

4. **Set as Firebase Secret**
   ```bash
   firebase functions:secrets:set DISCORD_WEBHOOK_URL
   # Paste your webhook URL when prompted
   ```

5. **Test**
   - Submit contact form
   - Check Discord for notification

---

### Telegram

1. **Create Bot**
   - Open Telegram, search for `@BotFather`
   - Send: `/newbot`
   - Follow prompts
   - Copy Bot Token (e.g., `123456789:ABCdef...`)

2. **Get Chat ID**
   - Search for `@userinfobot`
   - Send any message
   - Copy your Chat ID (e.g., `123456789`)

3. **Set as Firebase Secrets**
   ```bash
   firebase functions:secrets:set TELEGRAM_BOT_TOKEN
   firebase functions:secrets:set TELEGRAM_CHAT_ID
   ```

4. **Test**
   - Submit contact form
   - Check Telegram for bot message

---

### Microsoft Teams

1. **Create Webhook**
   - Go to Teams channel
   - Click "..." → Connectors
   - Search "Incoming Webhook"
   - Click "Add" → Configure
   - Name: "FreeFlow Notifications"
   - Copy Webhook URL

2. **Set as Firebase Secret**
   ```bash
   firebase functions:secrets:set TEAMS_WEBHOOK_URL
   ```

3. **Test**
   - Submit contact form
   - Check Teams for notification

---

### Email (Admin Notifications)

1. **Already Configured!**
   - Uses SendGrid (SENDGRID_API_KEY)
   - Just update admin email in `functions/index.js`
   - Search for `admin@freeflowmedia.com` and replace

---

### Slack (Legacy Support)

1. **Create Webhook**
   - Visit https://api.slack.com/messaging/webhooks
   - Add to Slack → Choose channel
   - Copy Webhook URL

2. **Set as Firebase Secret**
   ```bash
   firebase functions:secrets:set SLACK_WEBHOOK_URL
   ```

---

## 📝 Configuration

### Update Platforms in ContactModal.jsx

```javascript
// Current: Discord + Telegram + Email
runNewLeadAutomation(leadData, ['discord', 'telegram', 'email'])

// Use Slack instead:
runNewLeadAutomation(leadData, ['slack', 'discord', 'email'])

// Use Teams:
runNewLeadAutomation(leadData, ['teams', 'email'])

// Use all platforms:
runNewLeadAutomation(leadData, ['slack', 'discord', 'teams', 'telegram', 'email'])
```

---

## 🔔 Notification Message Format

All platforms receive:
```
🎯 New Lead Received!

👤 Name: [Business Name]
📧 Email: [Email]
📱 Phone: [Phone or N/A]
📍 Source: [Source]
💬 Message: [Message or No message]
```

---

## 🧪 Testing

1. **Deploy Functions:**
   ```bash
   firebase deploy --only functions:notifyNewLead
   ```

2. **Submit Test Lead:**
   - Visit contact form
   - Fill out and submit
   - Check all configured platforms

3. **Verify Delivery:**
   - Discord: Check #leads channel
   - Telegram: Check bot messages
   - Teams: Check channel
   - Email: Check inbox

---

## 💡 Pro Tips

1. **Use Discord as Primary**
   - Faster than Slack
   - Better mobile experience
   - Free unlimited history

2. **Add Telegram for Mobile**
   - Instant push notifications
   - Works offline (syncs when online)
   - Perfect for on-the-go alerts

3. **Email for Formal Record**
   - Always works (no app needed)
   - Searchable and trackable
   - Professional appearance

4. **Redundancy is Key**
   - Don't rely on single platform
   - Use 2-3 platforms simultaneously
   - Ensures you never miss a lead

---

## 📊 Notification Flow

```
User submits contact form
  ↓
✅ Lead saved to Firestore
  ↓
✅ Multi-platform notification:
   ├─ Discord (instant)
   ├─ Telegram (instant)
   └─ Email (formal record)
  ↓
✅ Confirmation email to user
  ↓
✅ AI outreach email generated
  ↓
Team sees notification → Responds within 24 hours
```

---

## 📚 Related

- [[01-Complete-Automation-Overview|Automation Overview]]
- [[07-Deployment-Guide|Deployment Guide]]
- [[08-Firebase-Setup|Firebase Setup]]

---

**Notifications ready to configure! 🚀**
