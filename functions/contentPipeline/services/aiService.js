const promptTemplates = require('./promptTemplates');
const { getProfile, buildPromptPrefix } = require('./brandDnaService');

const PROJECT_ID = 'freeflow-media';
const LOCATION = 'us-central1';
const MODEL = 'gemini-2.5-flash';

let vertexAI = null;
let generativeModel = null;

const getModel = () => {
  if (!generativeModel) {
    const { VertexAI } = require('@google-cloud/vertexai');
    vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    generativeModel = vertexAI.getGenerativeModel({ model: MODEL });
  }
  return generativeModel;
};

const generateContentCalendar = async (briefData, clientId = null) => {
  let brandDnaPrefix = '';
  if (clientId) {
    try {
      const profile = await getProfile(clientId);
      brandDnaPrefix = buildPromptPrefix(profile);
    } catch (err) {
      // non-blocking — generation continues without Brand DNA
    }
  }
  const prompt = promptTemplates.getContentCalendarPrompt({ ...briefData, brandDnaPrefix });
  try {
    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const text = result.response.candidates[0].content.parts[0].text;
    return JSON.parse(text);
  } catch (error) {
    console.error('Error generating content calendar:', error);
    throw new Error('Failed to generate content calendar');
  }
};

const generateInstagramCaption = async (data) => {
  const prompt = promptTemplates.getInstagramCaptionPrompt(data);
  try {
    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    return result.response.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error generating Instagram caption:', error);
    throw new Error('Failed to generate Instagram caption');
  }
};

module.exports = {
  generateContentCalendar,
  generateInstagramCaption,
};