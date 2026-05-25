const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TYPES = {
  pitch:    'a compelling 3-paragraph sales pitch (max 200 words)',
  email:    'a personalized cold outreach email with subject line',
  followup: 'a Day 3 follow-up email assuming no reply to the first outreach',
};

async function runSalesAgent(brief, type = 'pitch') {
  const contentType = TYPES[type] || TYPES.pitch;
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: `You are a sharp B2B sales agent for Drift Studio, a South African digital marketing agency.
Write ${contentType} for this lead/business:

${brief}

Rules: no em dashes, contractions throughout (you're, we've, it's), no buzzwords.
Single specific CTA at the end. Output ONLY the content — no preamble.`,
  });
  return response.text ?? 'Generation failed.';
}

module.exports = { runSalesAgent };
