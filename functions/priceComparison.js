/**
 * ========================================================
 * FIREBASE FUNCTION: Price Comparison Generator
 * ========================================================
 * 
 * Add this to your functions/index.js file
 * Uses AI to analyze market pricing and generate comparisons
 */

// Add this to your existing functions/index.js:

const { GoogleGenAI } = require("@google/genai");

// ==================== 13. PRICE COMPARISON GENERATOR ====================

exports.generatePriceComparison = onRequest(
  { secrets: ["GEMINI_API_KEY"], cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const {
        businessType,
        industry,
        location,
        targetMarket,
        currentPricing,
        competitors,
        productService,
        priceRange,
        targetGoal
      } = req.body;

      if (!businessType || !industry) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      logger.info(`Generating price comparison for: ${businessType}`);

      try {
        const pricingPrompt = `
You are an expert pricing analyst specializing in competitive market analysis.

Generate a comprehensive price comparison report for this business:

**Business Details:**
- Business Type: ${businessType}
- Industry: ${industry}
- Location: ${location || "Global"}
- Target Market: ${targetMarket || "General"}
- Current Pricing: ${currentPricing || "Not provided"}
- Product/Service: ${productService || "Not specified"}
- Price Range: ${priceRange || "Not specified"}
- **Target Goal: ${targetGoal || "Not specified - provide general recommendations"}**

**Known Competitors:** ${competitors ? competitors.join(", ") : "Research and identify top competitors"}

Generate a detailed JSON price comparison report with the following structure:

{
  "reportTitle": "Competitive Price Analysis for [Business Name]",
  "generatedDate": "Current date",
  "businessSummary": {
    "businessType": "Type of business",
    "industry": "Industry name",
    "location": "Location",
    "targetMarket": "Target market description"
  },
  "marketOverview": {
    "marketSize": "Estimated market size",
    "growthRate": "Annual growth rate percentage",
    "averagePricePoint": "Average price in the market",
    "priceRange": {
      "low": "Lowest price point",
      "high": "Highest price point",
      "median": "Median price"
    }
  },
  "competitorAnalysis": [
    {
      "rank": 1,
      "companyName": "Competitor name",
      "marketPosition": "Market leader/challenger/follower/niche",
      "pricing": {
        "basic": {
          "name": "Basic tier name",
          "price": "Price amount",
          "frequency": "monthly/one-time/etc",
          "features": ["Feature 1", "Feature 2"]
        },
        "standard": {
          "name": "Standard tier name",
          "price": "Price amount",
          "frequency": "monthly/one-time/etc",
          "features": ["Feature 1", "Feature 2"]
        },
        "premium": {
          "name": "Premium tier name",
          "price": "Price amount",
          "frequency": "monthly/one-time/etc",
          "features": ["Feature 1", "Feature 2"]
        }
      },
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"],
      "marketShare": "Estimated market share percentage",
      "website": "Website URL"
    }
  ],
  "pricingStrategies": [
    {
      "strategy": "Strategy name (e.g., Premium Pricing, Penetration Pricing)",
      "description": "How it works",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1", "Con 2"],
      "bestFor": "When to use this strategy",
      "recommendedPrice": "Suggested price point"
    }
  ],
  "recommendations": {
    "optimalPricing": {
      "basic": "Recommended basic tier price",
      "standard": "Recommended standard tier price",
      "premium": "Recommended premium tier price"
    },
    "positioning": "How to position in the market (budget/mid-range/premium)",
    "keyDifferentiators": ["Differentiator 1", "Differentiator 2"],
    "pricingTactics": ["Tactic 1", "Tactic 2"],
    "actionItems": [
      {
        "priority": "High/Medium/Low",
        "action": "Specific action to take",
        "timeline": "When to implement",
        "expectedImpact": "Expected revenue/pricing impact"
      }
    ]
  },
  "visualComparisonData": {
    "pricePerFeature": [
      {
        "feature": "Feature name",
        "yourBusiness": "Your price or 'Not offered'",
        "competitor1": "Competitor 1 price",
        "competitor2": "Competitor 2 price",
        "competitor3": "Competitor 3 price"
      }
    ],
    "valueScore": {
      "yourBusiness": "Score out of 10",
      "competitor1": "Score out of 10",
      "competitor2": "Score out of 10"
    }
  }
}

IMPORTANT:
- Use real, accurate pricing data where possible
- Include at least 5-7 competitors
- Provide specific price points, not ranges
- Make recommendations actionable and specific
- **Factor the target goal into pricing recommendations and action items**
- **If target goal is specified, create specific strategies to achieve it**
- Return ONLY valid JSON, no markdown formatting
`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: pricingPrompt,
          config: { responseMimeType: "application/json" }
        });

        const priceComparison = JSON.parse(response.text);

        // Save to Firestore for history
        const comparisonRecord = {
          businessType,
          industry,
          location,
          targetMarket,
          comparison: priceComparison,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "generated"
        };

        await db.collection("priceComparisons").add(comparisonRecord);

        logger.info(`Price comparison generated for: ${businessType}`);
        return res.status(200).json({ data: priceComparison });

      } catch (error) {
        logger.error("Price comparison generation failed:", error);
        return res.status(500).json({ error: "Price comparison generation failed" });
      }
    });
  }
);

// ==================== 14. COMPETITOR PRICE TRACKING (Scheduled) ====================

exports.updateCompetitorPricing = onSchedule(
  "0 9 1 * *", // First day of every month at 9 AM
  { timeZone: "Africa/Johannesburg" },
  async (event) => {
    logger.info("Running monthly competitor pricing update...");

    try {
      // Get all price comparisons from Firestore
      const comparisonsSnapshot = await db.collection("priceComparisons")
        .where("status", "==", "generated")
        .get();

      if (comparisonsSnapshot.empty) {
        logger.info("No price comparisons found");
        return { success: true, count: 0 };
      }

      let updateCount = 0;

      for (const doc of comparisonsSnapshot.docs) {
        const comparison = doc.data();

        try {
          // Generate updated pricing using AI
          const updatePrompt = `
Update the competitor pricing for this business (monthly update):

Business: ${comparison.businessType}
Industry: ${comparison.industry}
Location: ${comparison.location}

Check for any pricing changes in the market. Identify:
1. New competitors entered the market
2. Existing competitors changed their pricing
3. New pricing trends or shifts
4. Updated recommendations

Return updated competitorAnalysis array and recommendations only as JSON.
`;

          const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: updatePrompt,
            config: { responseMimeType: "application/json" }
          });

          const updatedData = JSON.parse(response.text);

          // Update the comparison document
          await db.collection("priceComparisons").doc(doc.id).update({
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            competitorAnalysis: updatedData.competitorAnalysis || [],
            recommendations: updatedData.recommendations || {},
            updateHistory: admin.firestore.FieldValue.arrayUnion({
              date: new Date().toISOString(),
              changes: "Monthly pricing update"
            })
          });

          updateCount++;
          logger.info(`Updated pricing for: ${comparison.businessType}`);
        } catch (error) {
          logger.error(`Failed to update pricing for ${comparison.businessType}:`, error);
        }
      }

      logger.info(`Competitor pricing update complete: ${updateCount} updated`);
      return { success: true, updated: updateCount };
    } catch (error) {
      logger.error("Competitor pricing update failed:", error);
      return { success: false, error: error.message };
    }
  }
);
