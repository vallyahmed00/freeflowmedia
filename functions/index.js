/**
 * ========================================================
 * FIREBASE FUNCTIONS - Complete Automation Suite
 * ========================================================
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. cd to functions directory
 * 2. Run: npm install @google/genai cors nodemailer @sendgrid/mail axios
 * 3. Set secrets:
 *    firebase functions:secrets:set GEMINI_API_KEY
 *    firebase functions:secrets:set SENDGRID_API_KEY
 *    firebase functions:secrets:set SLACK_WEBHOOK_URL
 *    firebase functions:secrets:set APIFY_API_KEY
 * 4. Deploy: firebase deploy --only functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");
const { Resend } = require("resend");

admin.initializeApp();
const db = admin.firestore();

// ==================== AI RESPONSE CACHE ====================

const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const getCacheKey = (inputs) => {
  const str = JSON.stringify(inputs);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return `cache_${Math.abs(hash)}`;
};

const getCachedResult = async (collection, key) => {
  const doc = await db.collection(collection).doc(key).get();
  if (!doc.exists) return null;
  const { cachedAt, result } = doc.data();
  if (Date.now() - cachedAt.toMillis() > AI_CACHE_TTL_MS) return null;
  return result;
};

const setCachedResult = async (collection, key, result) => {
  await db.collection(collection).doc(key).set({
    result,
    cachedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const parseJsonResponse = (text, context) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse AI JSON response for ${context}`, { cause: err });
  }
};

/**
 * Lazy-load Gemini AI to ensure secrets are available.
 * Must be used inside function handlers where 'secrets' are defined.
 */
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }
  return new GoogleGenAI(apiKey);
};

// ==================== SALES AGENT HELPERS ====================

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  return new Resend(apiKey);
};

const postDiscordAlert = async (message) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await axios.post(webhookUrl, { content: message });
  } catch (e) {
    logger.error("Discord alert failed:", e.message);
  }
};

const HUMANIZER_RULES = `HUMANIZER RULES — apply every one:
- No em dashes (—)
- Never open with "I hope this finds you well" or any filler opener
- No rule-of-three bullet lists
- No sentence starting with an -ing verb
- Mix sentence lengths: short punchy lines alongside longer flowing ones
- Use contractions throughout (I'm, we've, don't, it's, you're)
- No corporate buzzwords: leverage, synergy, robust, seamlessly, holistic, ecosystem
- Single specific CTA only — never multiple asks
- Reference the business name and industry in the first sentence`;

const buildOutreachEmail = async (lead, step) => {
  const { business_name, industry, notes } = lead;
  const sanitize = (val, maxLen = 200) =>
    String(val ?? "").replace(/[\n\r`{}]/g, " ").slice(0, maxLen);
  const safeName     = sanitize(business_name);
  const safeIndustry = sanitize(industry);
  const safeNotes    = sanitize(notes, 500);
  const ai = getAI();
  let prompt;

  if (step === 1) {
    prompt = `You are Ahmed from Drift Studio, a South African marketing agency. Write a Day 1 cold outreach email to ${safeName}, a business in the ${safeIndustry || "general"} industry.

Goal: Open a conversation. No pitch, no pricing.
Instructions:
- Max 150 words
- Reference "${safeName}" and "${safeIndustry || "your industry"}" in the first sentence
- Mention one specific challenge businesses in the ${safeIndustry || "general"} industry face
- Ask one open question that invites a reply
- Sign off as "Ahmed, Drift Studio"
${HUMANIZER_RULES}
${safeNotes ? `Context about this lead: ${safeNotes}` : ""}

Respond with a JSON object: { "subject": "...", "body": "..." }
Output ONLY raw JSON. No markdown, no explanation.`;
  } else if (step === 2) {
    prompt = `You are Ahmed from Drift Studio, a South African marketing agency. Write a Day 3 follow-up email to ${safeName}, a business in the ${safeIndustry || "general"} industry. They didn't reply to your first email.

Goal: A fresh hook. Different value angle.
Instructions:
- Max 120 words
- Reference the Day 1 email briefly ("I reached out earlier this week")
- Lead with a stat, trend, or insight relevant to the ${safeIndustry || "general"} industry in South Africa
- One question at the end
- Do not mention pricing or services directly
- Sign off as "Ahmed, Drift Studio"
${HUMANIZER_RULES}
${safeNotes ? `Context about this lead: ${safeNotes}` : ""}

Respond with a JSON object: { "subject": "...", "body": "..." }
Output ONLY raw JSON. No markdown, no explanation.`;
  } else {
    prompt = `You are Ahmed from Drift Studio, a South African marketing agency. Write a Day 7 final follow-up email to ${safeName}, a business in the ${safeIndustry || "general"} industry. They haven't replied to two previous emails.

Goal: Last attempt. Give something before leaving.
Instructions:
- Max 160 words
- Acknowledge this is the last follow-up
- Include one specific, actionable marketing tip for a ${safeIndustry || "general"} business in South Africa
- End with: "If the timing's not right, no worries — I'll leave it here. Feel free to reach out whenever."
- No hard sell
- Sign off as "Ahmed, Drift Studio"
${HUMANIZER_RULES}
${safeNotes ? `Context about this lead: ${safeNotes}` : ""}

Respond with a JSON object: { "subject": "...", "body": "..." }
Output ONLY raw JSON. No markdown, no explanation.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const raw = (response.text ?? "").trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  return parseJsonResponse(raw, `buildOutreachEmail step ${step}`);
};

// ==================== CONTENT STUDIO HELPERS ====================

const buildContentPrompt = ({ contentType, tone, brief, businessContext, targetAudience, brandVoice }) => {
  const bv = brandVoice || {};
  const brandSection = bv.businessName ? `
Brand Voice Profile:
- Business: ${bv.businessName}
- Industry: ${bv.industry || 'Not specified'}
- Target Audience: ${bv.targetAudience || targetAudience || 'Not specified'}
- Brand Words: ${(bv.brandWords || []).filter(Boolean).join(', ') || 'Not specified'}
- Core Services: ${bv.coreServices || 'Not specified'}
- Location: ${bv.location || 'Not specified'}` : '';

  return `You are an expert marketing copywriter producing ${contentType} content for a South African marketing agency client.
${brandSection}
${businessContext ? `Business/Brand Context: ${businessContext}` : ''}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

Content Brief:
${brief}

Tone: ${tone}
Content Type: ${contentType}

HUMANIZER RULES — apply every one:
- No em dashes (—)
- Never open with "I hope this finds you well" or any equivalent filler
- No rule-of-three bullet lists
- No sentence starting with an -ing verb
- Mix sentence lengths: short punchy lines alongside longer flowing ones
- Use contractions throughout (I'm, we've, don't, it's, you're)
- No corporate buzzwords: leverage, synergy, robust, seamlessly, holistic, ecosystem
- Single specific CTA only — never multiple asks
- Reference the client's specific context in the very first line

Write the ${contentType} now. Output ONLY the final content — no explanations, no preamble, no "Here is your..." intro.`;
};

// ==================== CONTENT STUDIO ====================

exports.contentGeneratorProxy = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { contentType, category, tone, brief, businessContext, targetAudience, brandVoice, userEmail } = req.body;

      if (!contentType || !tone || !brief || !userEmail) {
        return res.status(400).json({ error: "Missing required fields: contentType, tone, brief, userEmail" });
      }
      if (typeof brief !== "string" || brief.length > 2000) {
        return res.status(400).json({ error: "Brief must be a string under 2000 characters" });
      }
      if (typeof contentType !== "string" || contentType.length > 100) {
        return res.status(400).json({ error: "Invalid contentType" });
      }

      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentSnap = await db.collection("content_generations")
          .where("userEmail", "==", userEmail)
          .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(oneHourAgo))
          .get();
        if (recentSnap.size >= 20) {
          return res.status(429).json({ error: "Rate limit exceeded. Max 20 generations per hour." });
        }

        const prompt = buildContentPrompt({ contentType, tone, brief, businessContext, targetAudience, brandVoice });
        const response = await getAI().models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
        });
        const output = response.text ?? '';
        if (!output) {
          return res.status(502).json({ error: "Model returned no content. Please try again." });
        }

        const docRef = await db.collection("content_generations").add({
          userEmail,
          contentType,
          category: category || "General",
          tone,
          prompt: brief,
          output,
          charCount: output.length,
          version: 1,
          status: "draft",
          scheduledDate: null,
          platformVariants: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(200).json({ output, generationId: docRef.id });
      } catch (err) {
        logger.error("contentGeneratorProxy error:", err);
        return res.status(500).json({ error: "Generation failed. Please try again." });
      }
    });
  }
);

// ==================== SALES AGENT ====================

exports.salesAgentTrigger = onDocumentCreated(
  {
    document: "leads/{leadId}",
    secrets: ["RESEND_API_KEY", "GEMINI_API_KEY", "DISCORD_WEBHOOK_URL"],
    timeoutSeconds: 60,
  },
  async (event) => {
    const lead = event.data.data();
    const leadId = event.params.leadId;

    if (!lead.email) {
      logger.warn(`salesAgentTrigger: lead ${leadId} has no email, skipping`);
      return;
    }

    // Skip if salesAgent map was already initialized (re-created doc edge case)
    if (lead.salesAgent?.sequenceStep != null) return;

    try {
      const { subject, body } = await buildOutreachEmail(lead, 1);

      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: "Drift Studio <hello@driftstudio.co.za>",
        to: lead.email,
        subject,
        text: body,
        replyTo: "hello@driftstudio.co.za",
      });

      if (error || !data?.id) {
        logger.error(`salesAgentTrigger Resend error for ${leadId}:`, error ?? "data was null");
        return;
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      await db.collection("leads").doc(leadId).update({
        salesAgent: {
          status: "contacted",
          sequenceStep: 1,
          lastEmailedAt: now,
          firstContactedAt: now,
          qualifiedAt: null,
          replyDetectedAt: null,
          emailIds: [data.id],
          conversationSummary: `Day 1 intro sent. Subject: "${subject}"`,
          stopRequested: false,
        },
      });

      logger.info(`salesAgentTrigger: Day 1 email sent to ${lead.email} for lead ${leadId}`);
    } catch (err) {
      logger.error(`salesAgentTrigger error for ${leadId}:`, err);
    }
  }
);

// ==================== 1. STRATEGY GENERATION ====================

exports.generateStrategy = onRequest(
  { secrets: ["GEMINI_API_KEY", "PROMO_CODES"], cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const {
        businessType,
        targetAudience,
        currentMarketing,
        businessCountry,
        contentCategories,
        inStoreSpecials,
        userEmail,
        userName,
        marketingMaterialsLink,
        uploadedFileUrls,
        promoCode,
      } = req.body;

      if (!businessType || !targetAudience) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Server-side promo code validation — code never shipped in client bundle
      if (promoCode !== undefined && promoCode !== null) {
        const extraCodes = (process.env.PROMO_CODES || "")
          .split(",")
          .map(c => c.trim().toLowerCase())
          .filter(Boolean);
        const validCodes = ["family", ...extraCodes];
        if (!validCodes.includes(promoCode.toLowerCase())) {
          return res.status(400).json({ error: "Invalid promo code" });
        }
      }

      logger.info(`Generating strategy for: ${businessType}`);

      try {
        const masterPrompt = `
You are a top-tier marketing agency producing a premium strategy for a client.

Client Details:
- Business Type: ${businessType}
- Target Audience: ${targetAudience}
- Location: ${businessCountry || "Global"}
- Current Efforts: ${currentMarketing || "None"}
- Desired Content Channels: ${contentCategories || "Social Media, Blog"}
- In-Store Specials/Focus: ${inStoreSpecials || "None"}
- Client Name: ${userName || "Not provided"}
- Client Email: ${userEmail || "Not provided"}
${marketingMaterialsLink ? `- Existing Brand Materials: ${marketingMaterialsLink} (factor in their brand identity and style)` : ""}
${uploadedFileUrls?.length ? `- Uploaded Brand Assets: ${uploadedFileUrls.length} file(s) provided — assume consistent brand style and quality.` : ""}

Generate a comprehensive roadmap structured EXACTLY as the following JSON. Do not include markdown tags, just the raw JSON:

{
  "businessName": "The business name or type",
  "marketAnalysis": "A deep-dive market analysis identifying core pain points of the target audience and 3 emerging market shifts.",
  "viralTrends": [
    "Viral trend hook 1 tailored to audience",
    "Viral trend hook 2",
    "Viral trend hook 3"
  ],
  "marketingConcepts": [
    {
      "concept": "Name of the concept",
      "format": "e.g., Short-form Video, Email Newsletter",
      "hook": "A scroll-stopping hook idea"
    }
  ],
  "instagramPosts": [
    {
      "visual": "Describe the image or video visually in detail",
      "caption": "Write a long-form, engaging caption using the FreeFlow premium aesthetic, complete with relevant hashtags."
    }
  ]
}
`;

        const response = await getAI().models.generateContent({
          model: "gemini-1.5-flash",
          contents: masterPrompt,
          config: { responseMimeType: "application/json" }
        });

        const strategyJson = parseJsonResponse(response.text, "strategy");

        // IMPORTANT: strategy persistence is handled by the client via saveStrategy(...)
        // This endpoint returns strategy JSON only to avoid duplicate Firestore documents.
        return res.status(200).json({ data: strategyJson });

      } catch (error) {
        logger.error("Generation failed:", error);
        return res.status(500).json({ error: "Generation failed", detail: error.message });
      }
    });
  }
);

// ==================== 2. LEAD NOTIFICATION AUTOMATION (Multi-Platform) ====================

/**
 * Send notification to multiple platforms:
 * - Slack (via webhook)
 * - Discord (via webhook)
 * - Microsoft Teams (via webhook)
 * - Telegram (via bot API)
 * - Email (via SendGrid)
 */
exports.notifyNewLead = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const authHeader = req.headers.authorization;
      const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!idToken) return res.status(401).json({ error: 'Unauthorized' });
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const adminDoc = await admin.firestore().collection('admins').doc(decoded.uid).get();
        if (!adminDoc.exists) return res.status(403).json({ error: 'Forbidden' });
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { lead, platforms } = req.body;
      const notificationPlatforms = platforms || ['slack', 'discord', 'telegram']; // Default platforms

      const results = {
        slack: { sent: false, error: null },
        discord: { sent: false, error: null },
        teams: { sent: false, error: null },
        telegram: { sent: false, error: null },
        email: { sent: false, error: null }
      };

      const message = `🎯 *New Lead Received!*\n\n*Name:* ${lead.business_name}\n*Email:* ${lead.email}\n*Phone:* ${lead.phone || "N/A"}\n*Source:* ${lead.source}\n*Message:* ${lead.notes || "No message"}`;

      // Slack Notification
      if (notificationPlatforms.includes('slack') && process.env.SLACK_WEBHOOK_URL) {
        try {
          await axios.post(process.env.SLACK_WEBHOOK_URL, {
            text: message,
            username: "FreeFlow Bot"
          });
          results.slack.sent = true;
          logger.info('Slack notification sent');
        } catch (error) {
          results.slack.error = error.message;
          logger.error('Slack notification failed:', error.message);
        }
      }

      // Discord Notification
      if (notificationPlatforms.includes('discord') && process.env.DISCORD_WEBHOOK_URL) {
        try {
          await axios.post(process.env.DISCORD_WEBHOOK_URL, {
            content: message.replace(/\*/g, ''), // Discord uses different markdown
            username: "FreeFlow Bot"
          });
          results.discord.sent = true;
          logger.info('Discord notification sent');
        } catch (error) {
          results.discord.error = error.message;
          logger.error('Discord notification failed:', error.message);
        }
      }

      // Microsoft Teams Notification
      if (notificationPlatforms.includes('teams') && process.env.TEAMS_WEBHOOK_URL) {
        try {
          await axios.post(process.env.TEAMS_WEBHOOK_URL, {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            themeColor: "9333EA",
            summary: "New Lead Received",
            sections: [{
              activityTitle: "🎯 New Lead Received!",
              activitySubtitle: `From: ${lead.business_name}`,
              facts: [
                { name: "Email", value: lead.email },
                { name: "Phone", value: lead.phone || "N/A" },
                { name: "Source", value: lead.source },
                { name: "Message", value: lead.notes || "No message" }
              ],
              markdown: true
            }]
          });
          results.teams.sent = true;
          logger.info('Teams notification sent');
        } catch (error) {
          results.teams.error = error.message;
          logger.error('Teams notification failed:', error.message);
        }
      }

      // Telegram Notification
      if (notificationPlatforms.includes('telegram') && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        try {
          const telegramMessage = `🎯 New Lead Received!\n\n👤 Name: ${lead.business_name}\n📧 Email: ${lead.email}\n📱 Phone: ${lead.phone || "N/A"}\n📍 Source: ${lead.source}\n💬 Message: ${lead.notes || "No message"}`;
          
          await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: telegramMessage,
              parse_mode: "HTML"
            }
          );
          results.telegram.sent = true;
          logger.info('Telegram notification sent');
        } catch (error) {
          results.telegram.error = error.message;
          logger.error('Telegram notification failed:', error.message);
        }
      }

      // Email Notification to Admin
      if (notificationPlatforms.includes('email') && process.env.SENDGRID_API_KEY) {
        try {
          const sgMail = require("@sendgrid/mail");
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);

          const msg = {
            to: "admin@driftstudio.co.za", // Replace with your admin email
            from: "notifications@driftstudio.co.za",
            subject: `🎯 New Lead: ${lead.business_name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #9333EA;">New Lead Received! 🎉</h1>
                <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Name:</strong> ${lead.business_name}</p>
                  <p><strong>Email:</strong> ${lead.email}</p>
                  <p><strong>Phone:</strong> ${lead.phone || "N/A"}</p>
                  <p><strong>Source:</strong> ${lead.source}</p>
                  <p><strong>Message:</strong> ${lead.notes || "No message"}</p>
                </div>
                <p style="color: #666;">View in admin panel: <a href="https://www.driftstudio.co.za/admin">Admin Panel</a></p>
              </div>
            `
          };

          await sgMail.send(msg);
          results.email.sent = true;
          logger.info('Admin email notification sent');
        } catch (error) {
          results.email.error = error.message;
          logger.error('Admin email notification failed:', error.message);
        }
      }

      return res.status(200).json({ 
        success: true, 
        notifications: results 
      });
    });
  }
);

// ==================== 3. AUTOMATED EMAIL SEQUENCE ====================

exports.sendLeadConfirmationEmail = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { lead } = req.body;

      if (!lead.email) {
        return res.status(400).json({ error: "Missing email" });
      }

      try {
        const sgMail = require("@sendgrid/mail");
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
          to: lead.email,
          from: "contact@driftstudio.co.za",
          subject: `Thanks for reaching out, ${lead.business_name}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #9333EA;">Hi ${lead.business_name}!</h2>
              <p>Thank you for contacting Drift Studio. We've received your inquiry and our team will get back to you within 24 hours.</p>
              <h3 style="color: #6B21A8;">What happens next?</h3>
              <ol>
                <li>Our team will review your requirements</li>
                <li>We'll schedule a discovery call (if needed)</li>
                <li>You'll receive a customized proposal</li>
              </ol>
              <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E5E7EB; color: #666;">
                Best regards,<br>
                <strong>The Drift Studio Team</strong>
              </p>
            </div>
          `
        };

        await sgMail.send(msg);
        logger.info(`Confirmation email sent to: ${lead.email}`);
        return res.status(200).json({ success: true });
      } catch (error) {
        logger.error("Email sending failed:", error);
        return res.status(500).json({ error: "Email sending failed" });
      }
    });
  }
);

// ==================== 4. AI EMAIL GENERATION FOR LEADS ====================

exports.generateOutreachEmail = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { lead } = req.body;

      try {
        const emailPrompt = `
Write a highly personalized, professional outreach email to this lead:

Business Name: ${lead.business_name}
Industry: ${lead.industry || "Not specified"}
Location: ${lead.location || "Not specified"}
Email: ${lead.email}
Phone: ${lead.phone || "Not provided"}
Message/Notes: ${lead.notes || "No additional info"}

The email should:
1. Be personalized and reference their specific business
2. Show we understand their challenges
3. Briefly explain how Drift Studio can help
4. Include a clear call-to-action (book a call)
5. Be concise (under 200 words)
6. Professional but conversational tone

Write only the email body, no subject line or greetings needed.
`;

        const response = await getAI().models.generateContent({
          model: "gemini-1.5-pro",
          contents: emailPrompt
        });

        return res.status(200).json({ emailContent: response.text });
      } catch (error) {
        logger.error("Email generation failed:", error);
        return res.status(500).json({ error: "Email generation failed" });
      }
    });
  }
);

// ==================== 5. STRATEGY DELIVERY EMAIL ====================

exports.deliverStrategyViaEmail = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { strategy, userEmail, businessName } = req.body;

      if (!userEmail) {
        return res.status(400).json({ error: "Missing userEmail" });
      }

      try {
        const sgMail = require("@sendgrid/mail");
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        // Generate summary using AI
        const summaryPrompt = `
Write a brief, exciting summary of this marketing strategy for ${businessName}:

${JSON.stringify(strategy, null, 2)}

Keep it under 100 words. Focus on the key insights and value delivered.
`;

        const summaryResponse = await getAI().models.generateContent({
          model: "gemini-1.5-pro",
          contents: summaryPrompt
        });

        const msg = {
          to: userEmail,
          from: "contact@driftstudio.co.za",
          subject: `Your Marketing Strategy for ${businessName} is Ready! 🚀`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #9333EA;">Your Strategy is Ready! 🎉</h1>
              <p>Hi there,</p>
              <p>Your comprehensive marketing strategy for <strong>${businessName}</strong> has been generated successfully!</p>
              
              <div style="background: #F3F4F6; padding: 20px; border-left: 4px solid #9333EA; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #6B21A8;">What's included:</h3>
                <ul>
                  <li>Market analysis & viral trends</li>
                  <li>${strategy.marketingConcepts?.length || 0} tailored marketing concepts</li>
                  <li>${strategy.instagramPosts?.length || 0} ready-to-post social media ideas</li>
                </ul>
              </div>

              <p><strong>Summary:</strong></p>
              <p>${summaryResponse.text}</p>

              <a href="https://www.driftstudio.co.za/marketing-generator" 
                 style="display: inline-block; background: #9333EA; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
                View Your Strategy
              </a>

              <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E5E7EB; color: #666;">
                Questions? Reply to this email or visit our website.<br>
                <strong>Drift Studio</strong> | https://www.driftstudio.co.za
              </p>
            </div>
          `
        };

        await sgMail.send(msg);
        logger.info(`Strategy delivered to: ${userEmail}`);
        return res.status(200).json({ success: true });
      } catch (error) {
        logger.error("Strategy delivery failed:", error);
        return res.status(500).json({ error: "Strategy delivery failed" });
      }
    });
  }
);

// ==================== 5B. STRATEGY DELIVERY WITH PDF ATTACHMENT ====================
/**
 * Generates a PDF from the strategy data and emails it to the client
 * Uses HTML-to-PDF conversion via external service or base64 encoding
 */
exports.deliverStrategyWithPDF = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { strategy, userEmail, businessName, userName } = req.body;

      if (!userEmail || !strategy) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      try {
        const sgMail = require("@sendgrid/mail");
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        // Generate AI summary
        const summaryPrompt = `
Write a brief, exciting summary of this marketing strategy for ${businessName}:

${JSON.stringify(strategy, null, 2)}

Keep it under 100 words. Focus on the key insights and value delivered.
`;

        const summaryResponse = await getAI().models.generateContent({
          model: "gemini-1.5-pro",
          contents: summaryPrompt
        });

        // Create HTML content for PDF conversion
        const pdfHtmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${businessName} - Marketing Strategy</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333; }
    h1 { color: #9333EA; border-bottom: 3px solid #9333EA; padding-bottom: 10px; }
    h2 { color: #9333EA; margin-top: 30px; }
    h3 { color: #6B21A8; }
    .concept { background: #F3F4F6; padding: 15px; border-left: 4px solid #9333EA; margin: 15px 0; }
    .post { background: #FAFAFA; padding: 15px; border: 1px solid #E5E7EB; margin: 15px 0; }
    ul, ol { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <h1>${businessName} - Marketing Strategy</h1>
  <p style="color: #666;">Generated on ${new Date().toLocaleDateString()} by Drift Studio</p>

  <h2>Market Analysis</h2>
  <p>${strategy.marketAnalysis || 'N/A'}</p>

  <h2>Viral Trends</h2>
  <ol>${(strategy.viralTrends || []).map(t => `<li>${t}</li>`).join('')}</ol>

  <h2>Marketing Concepts</h2>
  ${(strategy.marketingConcepts || []).map((c, i) => `
    <div class="concept">
      <h3>${i + 1}. ${c.concept || ''}</h3>
      <p><strong>Format:</strong> ${c.format || ''}</p>
      <p><strong>Hook:</strong> ${c.hook || ''}</p>
    </div>
  `).join('')}

  <h2>Social Media Posts</h2>
  ${(strategy.instagramPosts || []).map((p, i) => `
    <div class="post">
      <h3>Post ${i + 1}</h3>
      <p><strong>Visual:</strong> ${p.visual || ''}</p>
      <p><strong>Caption:</strong></p>
      <p>${(p.caption || '').replace(/\n/g, '<br>')}</p>
    </div>
  `).join('')}

  <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #E5E7EB; text-align: center; color: #999;">
    <p>Generated by Drift Studio - Content Ideator</p>
    <p>https://www.driftstudio.co.za</p>
  </div>
</body>
</html>
        `;

        // Convert HTML to base64 PDF
        // Note: In production, you'd use a service like PDFShift, DocRaptor, or Puppeteer
        // For now, we'll use a simpler approach: email the HTML content
        // and provide a download link

        // For actual PDF attachment, use SendGrid's attachment feature:
        // const pdfBuffer = await convertHtmlToPdf(pdfHtmlContent);
        // attachments: [{ content: pdfBuffer.toString('base64'), filename: 'strategy.pdf', type: 'application/pdf', disposition: 'attachment' }]

        // For now, we'll send the HTML email with a prominent download link
        // and the full strategy embedded

        const msg = {
          to: userEmail,
          from: "contact@driftstudio.co.za",
          subject: `📄 Your Marketing Strategy PDF for ${businessName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #9333EA;">Your Strategy is Ready! 🎉</h1>
              <p>Hi ${userName || 'there'},</p>
              
              <p>Your comprehensive marketing strategy for <strong>${businessName}</strong> has been generated and is ready for download!</p>

              <div style="background: #F3F4F6; padding: 20px; border-left: 4px solid #9333EA; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #6B21A8;">📊 What's Included:</h3>
                <ul>
                  <li>Market analysis & viral trends</li>
                  <li>${strategy.marketingConcepts?.length || 0} tailored marketing concepts</li>
                  <li>${strategy.instagramPosts?.length || 0} ready-to-post social media ideas</li>
                </ul>
              </div>

              <p><strong>Summary:</strong></p>
              <p style="background: #FEF3C7; padding: 15px; border-radius: 8px;">${summaryResponse.text}</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.driftstudio.co.za/marketing-generator" 
                   style="display: inline-block; background: #9333EA; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  📥 Download Your Strategy PDF
                </a>
              </div>

              <div style="background: #DBEAFE; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0;">💡 Quick Tips:</h4>
                <ul style="margin-bottom: 0;">
                  <li>Review the market analysis to understand your audience</li>
                  <li>Start with the top 3 marketing concepts</li>
                  <li>Use the social media posts as inspiration</li>
                  <li>Export each concept separately for team sharing</li>
                </ul>
              </div>

              <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E5E7EB; color: #666;">
                Need help implementing this strategy? We offer full-service marketing packages.<br>
                <a href="https://www.driftstudio.co.za" style="color: #9333EA;">Learn More →</a><br><br>
                <strong>Drift Studio</strong> | https://www.driftstudio.co.za
              </p>
            </div>
          `
        };

        await sgMail.send(msg);
        logger.info(`Strategy PDF delivery email sent to: ${userEmail}`);
        
        // Update strategy status in Firestore
        if (req.body.strategyId) {
          await db.collection("strategies").doc(req.body.strategyId).update({
            status: "emailed",
            emailedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        return res.status(200).json({ success: true });
      } catch (error) {
        logger.error("Strategy PDF delivery failed:", error);
        return res.status(500).json({ error: "Strategy PDF delivery failed" });
      }
    });
  }
);

// ==================== 6. WEEKLY CONTENT DIGEST (SCHEDULED) ====================

exports.weeklyContentDigest = onSchedule(
  {
    schedule: "every monday 09:00",
    timeZone: "Africa/Johannesburg",
    secrets: ["GEMINI_API_KEY"]
  },
  async (event) => {
    logger.info("Running weekly content digest...");

    try {
      // Get all leads from the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const leadsSnapshot = await db.collection("leads")
        .where("createdAt", ">=", oneWeekAgo.toISOString())
        .get();

      const leads = leadsSnapshot.docs.map(doc => doc.data());

      logger.info(`Found ${leads.length} leads from the past week`);

      // For each lead, generate content ideas
      for (const lead of leads) {
        if (!lead.email || !lead.business_name) continue;

        const contentPrompt = `
Generate 5 fresh content ideas for ${lead.business_name} in the ${lead.industry || "general"} industry.

Target audience: ${lead.targetAudience || "general audience"}
Location: ${lead.location || "Global"}

Format as JSON array:
[
  {
    "title": "Content title",
    "type": "Blog/Video/Social Post/Infographic",
    "description": "Brief description",
    "hook": "Attention-grabbing hook"
  }
]
`;

        try {
          const response = await getAI().models.generateContent({
            model: "gemini-1.5-pro",
            contents: contentPrompt,
            config: { responseMimeType: "application/json" }
          });

          const contentIdeas = parseJsonResponse(response.text, "content ideas");

          // Save to lead's record
          await db.collection("leads").doc(lead.id).update({
            weeklyContentIdeas: admin.firestore.FieldValue.arrayUnion({
              date: new Date().toISOString(),
              ideas: contentIdeas
            })
          });

          logger.info(`Content ideas generated for: ${lead.business_name}`);
        } catch (error) {
          logger.error(`Failed to generate content for ${lead.business_name}:`, error);
        }
      }

      return { success: true, leadsProcessed: leads.length };
    } catch (error) {
      logger.error("Weekly digest failed:", error);
      return { success: false, error: error.message };
    }
  }
);

// ==================== 7. TESTIMONIAL REQUEST AUTOMATION ====================

exports.requestTestimonial = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { lead, daysSinceConversion } = req.body;

      if (!lead.email) {
        return res.status(400).json({ error: "Missing email" });
      }

      try {
        const sgMail = require("@sendgrid/mail");
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
          to: lead.email,
          from: "contact@driftstudio.co.za",
          subject: `How did we do, ${lead.business_name}?`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #9333EA;">Hi ${lead.business_name}! 👋</h2>
              <p>It's been a while since we generated your marketing strategy, and we'd love to hear how it's going!</p>
              
              <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Quick Question:</h3>
                <p>How has your marketing improved since using our Content Ideator?</p>
              </div>

              <p style="margin: 20px 0;">
                <a href="https://www.driftstudio.co.za/testimonial?lead=${lead.id}" 
                   style="display: inline-block; background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px;">
                  Share Your Experience
                </a>
              </p>

              <p>Or leave us a Google Review:</p>
              <p>
                <a href="https://g.page/review/YOUR_GOOGLE_REVIEW_LINK" 
                   style="display: inline-block; background: #4285F4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px;">
                  ⭐ Leave a Google Review
                </a>
              </p>

              <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E5E7EB; color: #666;">
                Your feedback helps us improve and helps other businesses like yours!<br>
                <strong>Drift Studio</strong>
              </p>
            </div>
          `
        };

        await sgMail.send(msg);
        logger.info(`Testimonial request sent to: ${lead.email}`);
        return res.status(200).json({ success: true });
      } catch (error) {
        logger.error("Testimonial request failed:", error);
        return res.status(500).json({ error: "Failed to send testimonial request" });
      }
    });
  }
);

// ==================== 8. PAYMENT WEBHOOK HANDLER ====================

exports.handlePaymentWebhook = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const paymentData = req.body;

      try {
        // Verify payment
        const isSuccessful = paymentData.status === "success" || paymentData.paid;

        if (isSuccessful) {
          // Update lead status
          if (paymentData.leadId) {
            await db.collection("leads").doc(paymentData.leadId).update({
              paymentStatus: "paid",
              paymentAmount: paymentData.amount,
              paymentDate: new Date().toISOString(),
              paymentMethod: paymentData.method || "yoco",
              status: "converted"
            });
          }

          // Create invoice record
          const invoice = {
            leadId: paymentData.leadId,
            amount: paymentData.amount,
            currency: paymentData.currency || "ZAR",
            status: "paid",
            paymentMethod: paymentData.method,
            transactionId: paymentData.transactionId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          };

          await db.collection("invoices").add(invoice);

          logger.info(`Payment processed for lead: ${paymentData.leadId}`);
          return res.status(200).json({ success: true });
        } else {
          logger.warn("Payment failed or pending:", paymentData);
          return res.status(200).json({ success: false, status: "pending" });
        }
      } catch (error) {
        logger.error("Payment webhook failed:", error);
        return res.status(500).json({ error: "Payment processing failed" });
      }
    });
  }
);

// ==================== 9. ABANDONED CART RECOVERY ====================

exports.checkAbandonedPayments = onSchedule(
  { schedule: "every 2 hours", timeZone: "Africa/Johannesburg", secrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"] },
  async () => {
    logger.info("Checking for abandoned payments...");

    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      // Fix: compare against Firestore Timestamp, not ISO string
      const abandonedSnapshot = await db.collection("payments")
        .where("status", "==", "pending")
        .where("recoveryEmailSent", "!=", true)
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(oneHourAgo))
        .get();

      if (abandonedSnapshot.empty) {
        logger.info("No abandoned payments found");
        return { success: true, count: 0 };
      }

      const resend = getResend();
      const fromEmail = process.env.RESEND_FROM_EMAIL;

      // Recovery promo code from env — add RECOVERY_PROMO to PROMO_CODES secret
      const recoveryCode = (process.env.PROMO_CODES || "family")
        .split(",")
        .map(c => c.trim())
        .find(c => c.toLowerCase().startsWith("recover")) || "RECOVERY10";

      let recoveryCount = 0;

      for (const doc of abandonedSnapshot.docs) {
        const payment = doc.data();

        if (!payment.userEmail) continue;

        try {
          await resend.emails.send({
            from: `Drift Studio <${fromEmail}>`,
            to: payment.userEmail,
            subject: "Complete your marketing strategy — 10% OFF",
            html: `
              <div style="font-family:sans-serif;background:#111827;color:#f3f4f6;max-width:600px;margin:0 auto;padding:32px;border-radius:12px;">
                <h2 style="color:#c084fc;">Don't leave your strategy behind!</h2>
                <p>Hi ${payment.userName || "there"},</p>
                <p>You were minutes away from your AI-generated marketing strategy. Complete your order in the next 24 hours and get <strong>10% off</strong>.</p>
                <div style="background:rgba(245,158,11,0.1);border-left:4px solid #f59e0b;padding:16px;margin:24px 0;border-radius:4px;">
                  <p style="margin:0;font-weight:700;">Your discount code:</p>
                  <p style="margin:8px 0 0;font-size:1.4rem;letter-spacing:2px;color:#f59e0b;">${recoveryCode}</p>
                </div>
                <p style="text-align:center;margin:32px 0;">
                  <a href="https://www.driftstudio.co.za/marketing-generator"
                     style="background:#9333ea;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
                    Complete My Strategy
                  </a>
                </p>
                <p style="color:#6b7280;font-size:0.85rem;text-align:center;">Offer expires in 24 hours · Drift Studio</p>
              </div>
            `
          });

          recoveryCount++;

          await db.collection("payments").doc(doc.id).update({
            recoveryEmailSent: true,
            recoveryEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
          });

          logger.info(`Recovery email sent for payment: ${doc.id}`);
        } catch (error) {
          logger.error(`Failed to send recovery email for ${doc.id}:`, error);
        }
      }

      logger.info(`Abandoned cart recovery: ${recoveryCount} emails sent`);
      return { success: true, count: recoveryCount };
    } catch (error) {
      logger.error("Abandoned cart check failed:", error);
      return { success: false, error: error.message };
    }
  }
);

// ==================== 10. LEAD ENRICHMENT VIA APIFY ====================

exports.enrichLeadData = onRequest(
  { cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { leadId, website } = req.body;

      if (!leadId || !website) {
        return res.status(400).json({ error: "Missing leadId or website" });
      }

      try {
        // Trigger Apify website scraper
        const apifyResponse = await axios.post(
          "https://api.apify.com/v2/acts",
          {
            startUrls: [{ url: website }],
            maxPages: 5
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.APIFY_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );

        const runId = apifyResponse.data.data.id;

        // Wait for results (poll every 5 seconds, max 60 seconds)
        let scrapedData = null;
        for (let i = 0; i < 12; i++) {
          await new Promise(resolve => setTimeout(resolve, 5000));

          const resultsResponse = await axios.get(
            `https://api.apify.com/v2/acts/${runId}/runs`,
            {
              headers: {
                Authorization: `Bearer ${process.env.APIFY_API_KEY}`
              }
            }
          );

          if (resultsResponse.data.data.status === "SUCCEEDED") {
            const itemsResponse = await axios.get(
              `https://api.apify.com/v2/acts/${runId}/runs/dataset/items`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.APIFY_API_KEY}`
                }
              }
            );

            scrapedData = itemsResponse.data;
            break;
          }
        }

        if (scrapedData) {
          // Update lead with enriched data
          await db.collection("leads").doc(leadId).update({
            enrichedData: scrapedData,
            enrichedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          logger.info(`Lead enriched: ${leadId}`);
          return res.status(200).json({ success: true, data: scrapedData });
        } else {
          return res.status(200).json({ success: false, message: "Scraping timed out" });
        }
      } catch (error) {
        logger.error("Lead enrichment failed:", error);
        return res.status(500).json({ error: "Lead enrichment failed" });
      }
    });
  }
);

// ==================== 11. SOCIAL MEDIA POSTING (Buffer/Hootsuite) ====================

exports.scheduleSocialPost = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { platform, content, scheduledTime, accessToken } = req.body;

      if (!platform || !content || !scheduledTime) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      try {
        // Buffer API integration
        const bufferResponse = await axios.post(
          "https://api.bufferapp.com/1/updates/create.json",
          {
            profile_id: accessToken,
            text: content.caption,
            media: {
              photo: content.imageUrl
            },
            scheduled_at: Math.floor(new Date(scheduledTime).getTime() / 1000)
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.BUFFER_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );

        logger.info(`Post scheduled on ${platform}:`, bufferResponse.data);
        return res.status(200).json({ success: true, data: bufferResponse.data });
      } catch (error) {
        logger.error("Social media scheduling failed:", error);
        return res.status(500).json({ error: "Scheduling failed" });
      }
    });
  }
);

// ==================== 12. WEBHOOK FOR N8N INTEGRATION ====================

exports.n8nWebhookHandler = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const n8nData = req.body;

      try {
        logger.info("Received n8n webhook:", n8nData);

        // Process based on event type
        switch (n8nData.eventType) {
          case "lead_created":
            // Trigger email sequence
            await db.collection("leads").doc(n8nData.leadId).update({
              status: "contacted",
              contactedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            break;

          case "email_sent":
            await db.collection("leads").doc(n8nData.leadId).update({
              emailStatus: "sent",
              lastEmailSent: new Date().toISOString()
            });
            break;

          case "follow_up_scheduled":
            await db.collection("leads").doc(n8nData.leadId).update({
              followUpDate: n8nData.followUpDate,
              followUpStatus: "scheduled"
            });
            break;

          default:
            logger.warn("Unknown n8n event type:", n8nData.eventType);
        }

        return res.status(200).json({ success: true });
      } catch (error) {
        logger.error("n8n webhook processing failed:", error);
        return res.status(500).json({ error: "Webhook processing failed" });
      }
    });
  }
);

// ==================== 13. PRICE COMPARISON ====================

const priceComparison = require('./priceComparison');
exports.generatePriceComparison = priceComparison.generatePriceComparison;
exports.updateCompetitorPricing = priceComparison.updateCompetitorPricing;

// ==================== 14. AUTOMATED CONTENT PIPELINE ====================

const onClientCreated = require('./contentPipeline/triggers/onClientCreated');
exports.onClientCreatedFunction = onClientCreated.onClientCreated;

const onContentBriefSubmitted = require('./contentPipeline/triggers/onContentBriefSubmitted');
exports.onContentBriefSubmittedFunction = onContentBriefSubmitted.onContentBriefSubmitted;

const approveContentEndpoint = require('./contentPipeline/endpoints/approveContent');
exports.approveContent = approveContentEndpoint.approveContent;

const scheduleSocialPosts = require('./contentPipeline/triggers/scheduleSocialPosts');
exports.queueApprovedPostsFunction = scheduleSocialPosts.queueApprovedPosts;
exports.processPostQueueFunction = scheduleSocialPosts.processPostQueue;

// Revision loop — re-generates calendar when client requests changes
const onCalendarRevisionRequested = require('./contentPipeline/triggers/onCalendarRevisionRequested');
exports.onCalendarRevisionRequested = onCalendarRevisionRequested.onCalendarRevisionRequested;

// Drip task runner — processes Day 1/3/7/14 client touchpoints
exports.processDripTasks = onClientCreated.processDripTasks;

// ==================== 15. XERO ACCOUNTING INTEGRATION ====================

const xero = require('./xero');
exports.xeroConnect = xero.xeroConnect;
exports.xeroCallback = xero.xeroCallback;
exports.createXeroInvoice = xero.createXeroInvoice;
exports.syncXeroPayments = xero.syncXeroPayments;


// ==================== 16. LEAD GENERATION (Apify) ====================

const generateLeads = require('./generateLeads');
exports.generateLeads = generateLeads.generateLeads;

// ==================== 18. COLD OUTREACH MODULE (TypeScript) ====================
// Requires: cd functions && npm run build  (compiles TS → lib/)
// Handlers are lazy-loaded inside each onRequest so they don't run at init time.

exports.outreach_researchProspect = onRequest(
  { secrets: ['GEMINI_API_KEY'], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    const { researchProspectHandler } = require('./lib/outreach/index');
    return researchProspectHandler(req, res);
  }
);

exports.outreach_generateEmail = onRequest(
  { secrets: ['GEMINI_API_KEY'], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    const { generateEmailHandler } = require('./lib/outreach/index');
    return generateEmailHandler(req, res);
  }
);

exports.outreach_buildSequence = onRequest(
  { secrets: ['GEMINI_API_KEY'], cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    const { buildSequenceHandler } = require('./lib/outreach/index');
    return buildSequenceHandler(req, res);
  }
);

exports.outreach_generateReport = onRequest(
  { cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    const { generateReportHandler } = require('./lib/outreach/index');
    return generateReportHandler(req, res);
  }
);

// ==================== 17. COLD OUTREACH EMAIL GENERATOR ====================

exports.generateColdOutreachEmail = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

      const { business_name, industry, location, website, description } = req.body;
      if (!business_name) return res.status(400).json({ error: "business_name is required" });

      try {
        const ai = getAI();
        const prompt = `You are a business development specialist at Drift Studio, a Cape Town-based digital marketing agency.

Write a short, personalised cold outreach email to the following potential client. The tone should be warm, professional, and concise — NOT salesy. No bullet lists. Max 180 words.

Lead Details:
- Business: ${business_name}
- Industry: ${industry || "N/A"}
- Location: ${location || "South Africa"}
- Website: ${website || "N/A"}
- About: ${description || "N/A"}

The email should:
1. Open with a genuine observation about their business (not generic flattery)
2. Briefly explain what Drift Studio does (AI-powered content, social media management, brand growth)
3. Ask one simple question to start a conversation
4. Sign off from Ahmed Vally, Drift Studio

Return ONLY the email body text, starting from the greeting. No subject line. No extra commentary.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
        });

        const email = response.text?.trim() || "";
        return res.status(200).json({ email });
      } catch (err) {
        logger.error("generateOutreachEmail error:", err.message);
        return res.status(500).json({ error: "Failed to generate email", detail: err.message });
      }
    });
  }
);

// ==================== 19. POST IMAGE GENERATION (Imagen 3) ====================

exports.generatePostImage = onRequest(
  { cors: true, timeoutSeconds: 90, memory: "512MiB" },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { prompt, postIndex } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "prompt is required" });
      }

      try {
        const { generateImagesForCalendar } = require("./contentPipeline/services/imageGenService");

        const results = await generateImagesForCalendar(
          [{ visual: prompt, platform: "instagram", day: postIndex ?? 1 }],
          "strategy-previews",
          `preview-${Date.now()}`,
          null
        );

        const imageUrl = results[0]?.imageUrl || null;
        if (!imageUrl) throw new Error("Image generation returned no result");

        return res.status(200).json({ imageUrl });
      } catch (err) {
        logger.error("generatePostImage error:", err.message);
        return res.status(500).json({ error: "Image generation failed", detail: err.message });
      }
    });
  }
);

// ==================== LEAD INTELLIGENCE PLATFORM ====================

exports.generateAILeads = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const niche = String(req.body.niche ?? "SaaS").slice(0, 100);
      const location = String(req.body.location ?? "Johannesburg, SA").slice(0, 100);
      const companySize = String(req.body.companySize ?? "Any").slice(0, 50);

      const prompt = `Generate exactly 5 fictional but plausible business leads for a sales professional targeting the ${niche} industry in ${location}.
${companySize !== "Any" ? `Company size filter: ${companySize} employees.` : ""}

Return ONLY a valid JSON array with exactly 5 objects. Each object must have these exact keys:
{
  "name": "Full Name",
  "role": "Job Title",
  "company": "Company Name",
  "painPoint": "One specific business pain point (max 15 words)",
  "signal": "One buying signal or trigger event (max 15 words)",
  "score": <integer 50-99>,
  "temperature": "hot" | "warm" | "cold",
  "estimatedBudget": "e.g. R15k–R30k/month",
  "bestContactTime": "e.g. Tuesday 10am–12pm"
}

Rules:
- Names must sound like real South African or international professionals
- Pain points must be specific to ${niche}
- Signals must be actionable buying triggers (hiring, funding, rebranding, etc.)
- Score 85+ = hot, 70–84 = warm, 50–69 = cold (must be consistent with temperature)
- No markdown, no explanation, ONLY the JSON array`;

      try {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error("Empty or safety-filtered response from Gemini");
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("No JSON array found in Gemini response");
        const leads = JSON.parse(jsonMatch[0]);

        const saved = [];
        for (const lead of leads) {
          const docRef = await db.collection("leads").add({
            ...lead,
            source: "ai_hunter",
            niche,
            location,
            companySize,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          saved.push({ id: docRef.id, ...lead });
        }

        logger.info(`generateAILeads: saved ${saved.length} leads for ${niche} in ${location}`);
        return res.status(200).json({ leads: saved });
      } catch (error) {
        logger.error("generateAILeads error:", error);
        return res.status(500).json({ error: "Failed to generate leads" });
      }
    });
  }
);

exports.generateOutreachScript = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 60 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const { lead } = req.body;
      if (!lead || typeof lead !== "object") return res.status(400).json({ error: "lead object is required" });

      const name = String(lead.name ?? "").slice(0, 100);
      const role = String(lead.role ?? "").slice(0, 100);
      const company = String(lead.company ?? "").slice(0, 100);
      const painPoint = String(lead.painPoint ?? "").slice(0, 200);
      const signal = String(lead.signal ?? "").slice(0, 200);
      const estimatedBudget = String(lead.estimatedBudget ?? "").slice(0, 100);

      const prompt = `Write a phone sales script for reaching out to ${name}, ${role} at ${company}.

Their main pain point: ${painPoint}
Buying signal: ${signal}
Estimated budget: ${estimatedBudget}

Return ONLY a valid JSON object with these exact keys. Each value is a short script segment (2-5 sentences):
{
  "opener": "Natural cold-call opening that references the signal without being creepy",
  "rapport": "1-2 lines to build quick connection. Ask one open question",
  "painAgitation": "Agitate the pain point. Make them feel it. No corporate language",
  "solutionPitch": "Pitch Drift Studio's solution to their specific pain. Concrete, brief",
  "objectionPrice": "Handle price objection naturally. Reference ROI or risk of inaction",
  "objectionNotInterested": "Handle 'not interested' with a disarming pivot",
  "close": "Ask for the next step. Specific, low-pressure ask"
}

Style rules:
- Use contractions throughout (I'm, we've, don't, it's, you're)
- Include [PAUSE] and [LISTEN] cues inline where natural
- Mix short punchy lines with longer ones
- Zero corporate buzzwords (no 'synergy', 'leverage', 'solutions')
- Sound like a real human conversation, not a robot
- No markdown, no explanation, ONLY the JSON object`;

      try {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) throw new Error("Empty or safety-filtered response from Gemini");
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON object found in response");
        const script = JSON.parse(jsonMatch[0]);
        return res.status(200).json({ script });
      } catch (error) {
        logger.error("generateOutreachScript error:", error);
        return res.status(500).json({ error: "Failed to generate script" });
      }
    });
  }
);

exports.sendLeadAlert = onRequest(
  {
    secrets: [
      "DISCORD_WEBHOOK_URL",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_CHAT_ID",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_WHATSAPP_FROM",
    ],
    cors: true,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const { type, lead, leads, channels = [], niche, location } = req.body;

      if (!type || !["single", "batch"].includes(type)) {
        return res.status(400).json({ error: "type must be 'single' or 'batch'" });
      }
      if (!Array.isArray(channels)) {
        return res.status(400).json({ error: "channels must be an array" });
      }

      const formatSingleLead = (l) =>
        `🎯 *New Lead — ${String(l.company ?? "").slice(0, 100)}*\n` +
        `👤 ${String(l.name ?? "").slice(0, 100)} | ${String(l.role ?? "").slice(0, 100)}\n` +
        `🔥 ${String(l.temperature ?? "").toUpperCase().slice(0, 10)} | Score: ${Number(l.score) || 0}/100\n` +
        `💢 Pain: ${String(l.painPoint ?? "").slice(0, 200)}\n` +
        `📡 Signal: ${String(l.signal ?? "").slice(0, 200)}\n` +
        `💰 Budget: ${String(l.estimatedBudget ?? "").slice(0, 100)}\n` +
        `🕐 Best time: ${String(l.bestContactTime ?? "").slice(0, 100)}\n` +
        `\n_Drift Studio Lead Hunter — driftstudio.co.za_`;

      const formatBatch = (ls, n, loc) => {
        const safeLeads = Array.isArray(ls) ? ls.slice(0, 20) : [];
        const header = `🎯 *${safeLeads.length} New AI Leads — ${String(n ?? "General").slice(0, 100)} in ${String(loc ?? "SA").slice(0, 100)}*\n\n`;
        const items = safeLeads
          .map(
            (l, i) =>
              `*${i + 1}. ${String(l.name ?? "").slice(0, 100)} @ ${String(l.company ?? "").slice(0, 100)}*\n` +
              `   ${String(l.role ?? "").slice(0, 100)} | ${String(l.temperature ?? "").toUpperCase()} ${Number(l.score) || 0}/100\n` +
              `   Pain: ${String(l.painPoint ?? "").slice(0, 200)}`
          )
          .join("\n\n");
        return header + items + "\n\n_Powered by Drift Studio — driftstudio.co.za_";
      };

      const message =
        type === "batch"
          ? formatBatch(leads, niche, location)
          : formatSingleLead(lead || {});

      const results = {};

      if (channels.includes("discord")) {
        try {
          const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
          if (webhookUrl) {
            await axios.post(webhookUrl, { content: message.replace(/\*/g, "**") });
            results.discord = "sent";
          } else {
            results.discord = "not_configured";
          }
        } catch (e) {
          logger.error("Discord send failed:", e.message);
          results.discord = "failed";
        }
      }

      if (channels.includes("telegram")) {
        try {
          const token = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID;
          if (token && chatId) {
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
              chat_id: chatId,
              text: message,
              parse_mode: "Markdown",
            });
            results.telegram = "sent";
          } else {
            results.telegram = "not_configured";
          }
        } catch (e) {
          logger.error("Telegram send failed:", e.message);
          results.telegram = "failed";
        }
      }

      if (channels.includes("whatsapp") && req.body.whatsappTo) {
        try {
          const sid = process.env.TWILIO_ACCOUNT_SID;
          const token = process.env.TWILIO_AUTH_TOKEN;
          const from = process.env.TWILIO_WHATSAPP_FROM;
          if (sid && token && from) {
            const to = String(req.body.whatsappTo).replace(/[^+\d]/g, "").slice(0, 20);
            const body = encodeURIComponent(message.replace(/\*/g, ""));
            await axios.post(
              `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
              `From=whatsapp:${from}&To=whatsapp:${to}&Body=${body}`,
              {
                auth: { username: sid, password: token },
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
              }
            );
            results.whatsapp = "sent";
          } else {
            results.whatsapp = "not_configured";
          }
        } catch (e) {
          logger.error("WhatsApp send failed:", e.message);
          results.whatsapp = "failed";
        }
      }

      logger.info("sendLeadAlert results:", results);
      return res.status(200).json({ success: true, results });
    });
  }
);

exports.processLeadStreams = onSchedule(
  {
    schedule: "0 6 * * 1",
    timeZone: "Africa/Johannesburg",
    secrets: [
      "GEMINI_API_KEY",
      "DISCORD_WEBHOOK_URL",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_CHAT_ID",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_WHATSAPP_FROM",
    ],
  },
  async () => {
    const snapshot = await db
      .collection("leadStreamSubscriptions")
      .where("active", "==", true)
      .get();

    if (snapshot.empty) {
      logger.info("processLeadStreams: no active subscriptions");
      return;
    }

    const generateForSubscription = async (sub) => {
      const {
        niche = "SaaS",
        location = "Johannesburg, SA",
        companySize = "Any",
        clientName,
        whatsapp,
        discordWebhook,
        telegramChatId,
      } = sub;

      const safeTelegramChatId = telegramChatId != null ? String(telegramChatId) : null;

      const prompt = `Generate exactly 5 fictional but plausible business leads for a sales professional targeting the ${String(niche).slice(0, 100)} industry in ${String(location).slice(0, 100)}.
${companySize !== "Any" ? `Company size filter: ${String(companySize).slice(0, 50)} employees.` : ""}
Return ONLY a valid JSON array with exactly 5 objects with keys: name, role, company, painPoint, signal, score (50-99), temperature (hot/warm/cold), estimatedBudget, bestContactTime.
No markdown, no explanation, ONLY the JSON array.`;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error("Empty response from Gemini for Lead Stream");
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array in Lead Stream Gemini response");
      const leads = JSON.parse(jsonMatch[0]);

      for (const lead of leads) {
        await db.collection("leads").add({
          ...lead,
          source: "lead_stream",
          clientName: String(clientName ?? "").slice(0, 100),
          niche,
          location,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const formatWeeklyMessage = (ls) => {
        const header = `🎯 Weekly Leads — ${niche} in ${location}\n\n`;
        const items = ls
          .map(
            (l, i) =>
              `${i + 1}. ${String(l.name ?? "").slice(0, 100)} @ ${String(l.company ?? "").slice(0, 100)}\n` +
              `   Role: ${String(l.role ?? "").slice(0, 100)}\n` +
              `   Pain: ${String(l.painPoint ?? "").slice(0, 200)}\n` +
              `   Score: ${Number(l.score) || 0}/100 | ${String(l.temperature ?? "").toUpperCase()}\n` +
              `   Budget: ${String(l.estimatedBudget ?? "").slice(0, 100)}\n` +
              `   Best time: ${String(l.bestContactTime ?? "").slice(0, 100)}`
          )
          .join("\n\n");
        return header + items + "\n\nPowered by Drift Studio Lead Stream\ndriftstudio.co.za";
      };

      const message = formatWeeklyMessage(leads);

      if (whatsapp) {
        try {
          const sid = process.env.TWILIO_ACCOUNT_SID;
          const token = process.env.TWILIO_AUTH_TOKEN;
          const from = process.env.TWILIO_WHATSAPP_FROM;
          const to = String(whatsapp).replace(/[^+\d]/g, "").slice(0, 20);
          const body = encodeURIComponent(message);
          await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
            `From=whatsapp:${from}&To=whatsapp:${to}&Body=${body}`,
            {
              auth: { username: sid, password: token },
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
          );
        } catch (e) {
          logger.error(`Lead Stream WhatsApp failed for ${clientName}:`, e.message);
        }
      }

      if (discordWebhook) {
        try {
          await axios.post(String(discordWebhook).slice(0, 500), { content: message });
        } catch (e) {
          logger.error(`Lead Stream Discord failed for ${clientName}:`, e.message);
        }
      }

      if (safeTelegramChatId) {
        try {
          const token = process.env.TELEGRAM_BOT_TOKEN;
          await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: safeTelegramChatId,
            text: message,
          });
        } catch (e) {
          logger.error(`Lead Stream Telegram failed for ${clientName}:`, e.message);
        }
      }
    };

    for (const doc of snapshot.docs) {
      try {
        await generateForSubscription(doc.data());
        await doc.ref.update({ lastRunAt: admin.firestore.FieldValue.serverTimestamp() });
        logger.info(`Lead Stream processed for: ${doc.data().clientName}`);
      } catch (e) {
        logger.error(`Lead Stream failed for doc ${doc.id}:`, e.message);
      }
    }
  }
);

// ==================== SALES AGENT FOLLOW-UP (SCHEDULED) ====================

exports.salesAgentFollowUp = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Africa/Johannesburg",
    secrets: ["RESEND_API_KEY", "GEMINI_API_KEY", "DISCORD_WEBHOOK_URL"],
    timeoutSeconds: 300,
  },
  async () => {
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const fourDaysMs = 4 * 24 * 60 * 60 * 1000; // Day 7 = Day 3 + 4 more days
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

    const TERMINAL_STATUSES = ["replied", "qualified", "bounced", "not_interested"];

    // --- Day 3 candidates: sequenceStep === 1, lastEmailedAt >= 3 days ago ---
    const step1Snap = await db.collection("leads")
      .where("salesAgent.sequenceStep", "==", 1)
      .get();

    const day3Candidates = step1Snap.docs.filter((doc) => {
      const sa = doc.data().salesAgent;
      if (!sa || sa.stopRequested || TERMINAL_STATUSES.includes(sa.status)) return false;
      const lastEmailedMs = sa.lastEmailedAt?.toMillis?.() || 0;
      return now - lastEmailedMs >= threeDaysMs;
    });

    // --- Day 7 candidates: sequenceStep === 2, lastEmailedAt >= 4 days ago ---
    const step2Snap = await db.collection("leads")
      .where("salesAgent.sequenceStep", "==", 2)
      .get();

    const day7Candidates = step2Snap.docs.filter((doc) => {
      const sa = doc.data().salesAgent;
      if (!sa || sa.stopRequested || TERMINAL_STATUSES.includes(sa.status)) return false;
      const lastEmailedMs = sa.lastEmailedAt?.toMillis?.() || 0;
      return now - lastEmailedMs >= fourDaysMs;
    });

    logger.info(`salesAgentFollowUp: ${day3Candidates.length} Day-3, ${day7Candidates.length} Day-7 candidates`);

    const resend = getResend();

    for (const doc of day3Candidates) {
      const lead = doc.data();
      const leadId = doc.id;
      if (!lead.email) continue;
      try {
        const { subject, body } = await buildOutreachEmail(lead, 2);
        const { data, error } = await resend.emails.send({
          from: "Drift Studio <hello@driftstudio.co.za>",
          to: lead.email,
          subject,
          text: body,
          replyTo: "hello@driftstudio.co.za",
        });
        if (error || !data?.id) { logger.error(`Day 3 Resend error for ${leadId}:`, error ?? "data was null"); continue; }

        await db.collection("leads").doc(leadId).update({
          "salesAgent.status": "followed_up_1",
          "salesAgent.sequenceStep": 2,
          "salesAgent.lastEmailedAt": admin.firestore.FieldValue.serverTimestamp(),
          "salesAgent.emailIds": admin.firestore.FieldValue.arrayUnion(data.id),
          "salesAgent.conversationSummary": `Day 1 intro + Day 3 follow-up sent. Last subject: "${subject}"`,
        });
        logger.info(`salesAgentFollowUp: Day 3 sent to ${lead.email}`);
      } catch (err) {
        logger.error(`salesAgentFollowUp Day 3 error for ${leadId}:`, err);
      }
    }

    for (const doc of day7Candidates) {
      const lead = doc.data();
      const leadId = doc.id;
      if (!lead.email) continue;
      try {
        const { subject, body } = await buildOutreachEmail(lead, 3);
        const { data, error } = await resend.emails.send({
          from: "Drift Studio <hello@driftstudio.co.za>",
          to: lead.email,
          subject,
          text: body,
          replyTo: "hello@driftstudio.co.za",
        });
        if (error || !data?.id) { logger.error(`Day 7 Resend error for ${leadId}:`, error ?? "data was null"); continue; }

        await db.collection("leads").doc(leadId).update({
          "salesAgent.status": "followed_up_2",
          "salesAgent.sequenceStep": 3,
          "salesAgent.lastEmailedAt": admin.firestore.FieldValue.serverTimestamp(),
          "salesAgent.emailIds": admin.firestore.FieldValue.arrayUnion(data.id),
          "salesAgent.conversationSummary": `Full 3-email sequence complete. No reply. Last subject: "${subject}"`,
        });
        logger.info(`salesAgentFollowUp: Day 7 sent to ${lead.email}`);
      } catch (err) {
        logger.error(`salesAgentFollowUp Day 7 error for ${leadId}:`, err);
      }
    }

    // --- Mark no_response for step 3 leads where Day 7 was sent 2+ days ago ---
    const step3Snap = await db.collection("leads")
      .where("salesAgent.sequenceStep", "==", 3)
      .where("salesAgent.status", "==", "followed_up_2")
      .get();

    for (const doc of step3Snap.docs) {
      const sa = doc.data().salesAgent;
      if (sa.stopRequested) continue;
      const lastEmailedMs = sa.lastEmailedAt?.toMillis?.() || 0;
      if (now - lastEmailedMs >= twoDaysMs) {
        await db.collection("leads").doc(doc.id).update({
          "salesAgent.status": "no_response",
        });
        logger.info(`salesAgentFollowUp: marked no_response for ${doc.id}`);
      }
    }
  }
);
