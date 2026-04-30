---
tags: [n8n, automation, freeflow-media, documentation, index]
created: 2026-04-13
updated: 2026-04-13
aliases: [N8N Suite, Automation Suite, Marketing Automation]
---

# 🚀 Drift Studio - N8N Automation Suite Guide

## 📋 Overview

This is the complete documentation for Drift Studio's N8N marketing automation suite. It covers lead processing, social media posting, engagement, and WhatsApp Business API integration.

---

## 📚 Documentation Index

### New Features & Changes (v2.0)
| Guide | Description |
|-------|-------------|
| [[N8N-00-Changes-Index|What's New in N8N]] | Complete list of all changes and new features |
| [[N8N-01-Firebase-First-Architecture|Firebase-First Architecture]] | Critical architectural changes, why Firebase-first |
| [[N8N-09-Firebase-Bidirectional-Integration|Firebase Bidirectional Integration]] | How N8N and Firebase communicate |
| [[N8N-08-Credential-Setup|Credential Setup]] | Complete guide to configuring all credentials |
| [[N8N-12-Troubleshooting|Troubleshooting]] | Common issues and solutions |
| [[N8N-13-Testing-Guide|Testing Guide]] | How to test each workflow |

### Core Workflows
| Guide | Description |
|-------|-------------|
| [[N8N-02-Complete-Workflow-Overview|Complete Workflow Overview]] | All 5 major workflows explained |
| [[01-Lead-Processing-Workflow|Lead Processing]] | Contact form → Multi-platform notifications → Email |
| [[02-Social-Media-Posting|Social Media Posting]] | Automated posting to Instagram, Facebook, TikTok |
| [[03-Social-Media-Engagement|Social Media Engagement]] | AI-powered DMs and comments replies |
| [[04-WhatsApp-Business-API|WhatsApp Business]] | Templates, images, audio, PDFs, promos |
| [[05-Setup-Configuration|Setup & Configuration]] | Credentials, webhooks, environment variables |
| [[06-Troubleshooting|Troubleshooting]] | Common issues and solutions |

---

## 🎯 Complete Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    N8N Automation Suite                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣ Lead Processing                                         │
│     Form → Sheets → Slack/Discord/Telegram/Email → AI       │
│                                                              │
│  2️⃣ Social Media Posting                                    │
│     Schedule → Fetch → Instagram + Facebook + TikTok        │
│                                                              │
│  3️⃣ Social Media Engagement                                 │
│     Webhook → AI Response → Auto-Reply DMs/Comments         │
│                                                              │
│  4️⃣ WhatsApp Business                                       │
│     Webhook → Templates/Images/Audio/PDFs/Promos            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Feature Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| Lead form processing | ✅ Live | Saves to Firestore + Sheets |
| Multi-platform notifications | ✅ Live | Slack, Discord, Telegram, Email |
| AI email generation | ✅ Live | Gemini-powered |
| Instagram posting | ✅ Ready | Via Facebook Graph API |
| Facebook posting | ✅ Ready | Via Facebook Graph API |
| TikTok posting | ✅ Ready | Via TikTok API |
| AI DM replies | ✅ Ready | Instagram DMs auto-reply |
| AI comment replies | ✅ Ready | Facebook/Instagram comments |
| WhatsApp templates | ✅ Ready | Promotional messages |
| WhatsApp images | ✅ Ready | Product images with captions |
| WhatsApp audio | ✅ Ready | Product sounds, voice notes |
| WhatsApp PDFs | ✅ Ready | Product specifications |
| Daily promo schedule | ✅ Ready | Automated broadcasts |

---

## 🔧 Quick Setup

1. **Import Workflow**
   - Open N8N dashboard
   - Import `n8n-marketing-workflow.json`
   - Review all nodes

2. **Set Credentials**
   - See [[05-Setup-Configuration|Setup Guide]]
   - Configure each platform
   - Test connections

3. **Set Environment Variables**
   ```
   GOOGLE_SHEETS_ID=your_sheet_id
   TIKTOK_ACCESS_TOKEN=your_token
   WHATSAPP_ACCESS_TOKEN=your_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_id
   GEMINI_API_KEY=your_key
   ```

4. **Activate Workflow**
   - Toggle "Active" to ON
   - Test each workflow individually
   - Monitor execution logs

---

## 📊 Platform Integrations

| Platform | Purpose | API Used |
|----------|---------|----------|
| Google Sheets | Lead backup | Google Sheets API |
| Slack | Team notifications | Webhook |
| Discord | Team notifications | Webhook |
| Telegram | Team notifications | Bot API |
| Email | Lead confirmations | SendGrid |
| Instagram | Posting & DMs | Facebook Graph API |
| Facebook | Posting & comments | Facebook Graph API |
| TikTok | Video posting | TikTok Business API |
| WhatsApp | Customer messaging | WhatsApp Business API |
| Firebase | Data storage | Cloud Functions |
| Google Gemini | AI responses | Gemini API |

---

## 🎯 Key Features

### Lead Processing
- Contact form submissions saved to Firestore and Google Sheets
- Multi-platform notifications (Slack, Discord, Telegram, Email)
- AI-generated personalized outreach emails
- Automatic confirmation emails to leads

### Social Media Posting
- Scheduled posts to Instagram, Facebook, and TikTok
- Fetch content from Firebase
- Simultaneous multi-platform posting
- Daily schedule trigger

### Social Media Engagement
- AI-powered auto-replies to DMs and comments
- Platform-aware responses
- Sales inquiry detection
- Support question handling

### WhatsApp Business
- Promotional message templates
- Product images with captions
- Audio clips (product sounds)
- Product specification PDFs
- Daily promotional broadcasts

---

## 📝 Workflow Status

| Workflow | Status | Last Updated |
|----------|--------|--------------|
| Lead Processing | ✅ Active | 2026-04-13 |
| Social Posting | 🟡 Ready | 2026-04-13 |
| Social Engagement | 🟡 Ready | 2026-04-13 |
| WhatsApp Business | 🟡 Ready | 2026-04-13 |

**Legend:**
- ✅ Active - Running in production
- 🟡 Ready - Configured, needs activation
- 🔴 Pending - Needs setup

---

## 🔗 Related Resources

- [[N8N-Analytics|Analytics & Monitoring]]
- [[Firebase-Functions|Firebase Functions Reference]]
- [[API-Credentials|API Credentials Management]]
- [[Automation-Testing|Testing Procedures]]

---

**Last updated:** 2026-04-13  
**Version:** 2.0  
**Maintainer:** Drift Studio Team
