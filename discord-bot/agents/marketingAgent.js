const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TYPES = {
  post:     'a single social media post with caption and 5 hashtags',
  reel:     'a 30-second Reel/TikTok script with hook, 3 key points, and CTA',
  ideas:    '8 content ideas as a numbered list (mix of posts, reels, stories)',
  strategy: 'a 5-point marketing strategy with specific tactics under each point',
};

async function runMarketingAgent(brief, type = 'ideas') {
  const contentType = TYPES[type] || TYPES.ideas;
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: `You are an expert social media strategist for Drift Studio, a South African digital marketing agency.
Generate ${contentType} for:

${brief}

Rules: South African context where relevant. No em dashes. Contractions throughout. No buzzwords.
Output ONLY the content — no preamble.`,
  });
  const text = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

module.exports = { runMarketingAgent };
