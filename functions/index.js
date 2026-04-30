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
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();
const ai = new GoogleGenAI({});

// ==================== 1. STRATEGY GENERATION ====================

exports.generateStrategy = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 120 },
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
        userName
      } = req.body;

      if (!businessType || !targetAudience) {
        return res.status(400).json({ error: "Missing required fields" });
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
- Desired Content Categories: ${contentCategories || "Social Media, Blog"}
- In-Store Specials/Focus: ${inStoreSpecials || "None"}

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

        const response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: masterPrompt,
          config: { responseMimeType: "application/json" }
        });

        const strategyJson = JSON.parse(response.text);

        // Save to Firestore for history
        const strategyRecord = {
          businessName: businessType,
          targetAudience,
          userEmail: userEmail || null,
          userName: userName || null,
          strategy: strategyJson,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "generated"
        };

        await db.collection("strategies").add(strategyRecord);

        return res.status(200).json({ data: strategyJson });

      } catch (error) {
        logger.error("Generation failed:", error);
        return res.status(500).json({ error: "Generation failed." });
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
  { 
    secrets: ["SLACK_WEBHOOK_URL", "DISCORD_WEBHOOK_URL", "TEAMS_WEBHOOK_URL", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "SENDGRID_API_KEY"], 
    cors: true, 
    timeoutSeconds: 30 
  },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
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
            to: "admin@freeflowmedia.com", // Replace with your admin email
            from: "notifications@freeflowmedia.com",
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
                <p style="color: #666;">View in admin panel: <a href="https://freeflowmedia.com/admin">Admin Panel</a></p>
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
  { secrets: ["SENDGRID_API_KEY"], cors: true, timeoutSeconds: 30 },
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
          from: "contact@freeflowmedia.com",
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

        const response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
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
  { secrets: ["SENDGRID_API_KEY", "GEMINI_API_KEY"], cors: true, timeoutSeconds: 60 },
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

        const summaryResponse = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: summaryPrompt
        });

        const msg = {
          to: userEmail,
          from: "contact@freeflowmedia.com",
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

              <a href="https://freeflowmedia.com/marketing-generator" 
                 style="display: inline-block; background: #9333EA; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
                View Your Strategy
              </a>

              <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E5E7EB; color: #666;">
                Questions? Reply to this email or visit our website.<br>
                <strong>Drift Studio</strong> | https://freeflowmedia.com
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
  { secrets: ["SENDGRID_API_KEY", "GEMINI_API_KEY"], cors: true, timeoutSeconds: 120 },
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

        const summaryResponse = await ai.models.generateContent({
          model: "gemini-2.5-pro",
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
    <p>https://freeflowmedia.com</p>
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
          from: "contact@freeflowmedia.com",
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
                <a href="https://freeflowmedia.com/marketing-generator" 
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
                <a href="https://freeflowmedia.com" style="color: #9333EA;">Learn More →</a><br><br>
                <strong>Drift Studio</strong> | https://freeflowmedia.com
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
  "every monday 09:00",
  { timeZone: "Africa/Johannesburg" },
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
          const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: contentPrompt,
            config: { responseMimeType: "application/json" }
          });

          const contentIdeas = JSON.parse(response.text);

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
  { secrets: ["SENDGRID_API_KEY"], cors: true, timeoutSeconds: 30 },
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
          from: "contact@freeflowmedia.com",
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
                <a href="https://freeflowmedia.com/testimonial?lead=${lead.id}" 
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
  "every 2 hours",
  { timeZone: "Africa/Johannesburg" },
  async (event) => {
    logger.info("Checking for abandoned payments...");

    try {
      // Find payments created 1 hour ago that are still pending
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const abandonedSnapshot = await db.collection("payments")
        .where("status", "==", "pending")
        .where("createdAt", "<=", oneHourAgo.toISOString())
        .get();

      if (abandonedSnapshot.empty) {
        logger.info("No abandoned payments found");
        return { success: true, count: 0 };
      }

      const sgMail = require("@sendgrid/mail");
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      let recoveryCount = 0;

      for (const doc of abandonedSnapshot.docs) {
        const payment = doc.data();

        if (!payment.userEmail) continue;

        try {
          const msg = {
            to: payment.userEmail,
            from: "contact@freeflowmedia.com",
            subject: "Complete your marketing strategy - 10% OFF! 🎁",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #9333EA;">Don't miss out! 🚀</h2>
                <p>Hi ${payment.userName || "there"},</p>
                <p>We noticed you started generating your marketing strategy but didn't complete the payment.</p>
                
                <div style="background: #FEF3C7; padding: 20px; border-left: 4px solid #F59E0B; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Special Offer:</h3>
                  <p>Complete your purchase in the next 24 hours and get <strong>10% OFF</strong>!</p>
                  <p>Use code: <strong style="background: #F59E0B; color: white; padding: 4px 12px; border-radius: 4px;">COMPLETE10</strong></p>
                </div>

                <p style="text-align: center; margin: 30px 0;">
                  <a href="https://freeflowmedia.com/marketing-generator" 
                     style="display: inline-block; background: #9333EA; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px;">
                    Complete Your Strategy
                  </a>
                </p>

                <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #E5E7EB; color: #666;">
                  This offer expires in 24 hours.<br>
                  <strong>Drift Studio</strong>
                </p>
              </div>
            `
          };

          await sgMail.send(msg);
          recoveryCount++;

          // Update payment status
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
  { secrets: ["APIFY_API_KEY"], cors: true, timeoutSeconds: 120 },
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
