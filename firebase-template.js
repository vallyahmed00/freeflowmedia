/**
 * ========================================================
 * FIREBASE FUNCTIONS TEMPLATE (Marketing Content Generator)
 * ========================================================
 * 
 * INSTRUCTIONS:
 * 1. Open your terminal in this `freeflow-media` folder.
 * 2. Run: `firebase init functions` and select Javascript.
 * 3. Inside the new `functions` directory, run: 
 *    `npm install @google/genai cors`
 * 4. Replace the contents of `functions/index.js` with the code below.
 * 5. Set your Gemini API key in Firebase:
   `firebase functions:secrets:set GEMINI_API_KEY`
 *    `firebase functions:secrets:set APIFY_API_KEY`
 * 6. Deploy with: `firebase deploy --only functions`
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { GoogleGenAI } = require("@google/genai");

admin.initializeApp();

// Initialize Gemini via Google Gen AI SDK
const ai = new GoogleGenAI({});

exports.generateStrategy = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true },
  (req, res) => {
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
          config: {
             responseMimeType: "application/json"
          }
        });

        const strategyJson = JSON.parse(response.text);
        return res.status(200).json({ data: strategyJson });

      } catch (error) {
        logger.error("Generation failed:", error);
        return res.status(500).json({ error: "Generation failed." });
      }
    });
  }
);
