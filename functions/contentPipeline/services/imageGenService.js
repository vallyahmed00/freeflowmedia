const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

const PROJECT_ID = 'freeflow-media';
const LOCATION = 'us-central1';
const IMAGEN_ENDPOINT = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict`;

const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

async function getAuthToken() {
  const client = await googleAuth.getClient();
  const res = await client.getAccessToken();
  return res.token;
}

async function generateImageBase64(prompt) {
  const token = await getAuthToken();
  const response = await axios.post(
    IMAGEN_ENDPOINT,
    {
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/jpeg',
        safetyFilterLevel: 'block_some',
        personGeneration: 'allow_adult',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );
  return response.data.predictions[0].bytesBase64Encoded;
}

async function uploadImageToStorage(base64Data, storagePath) {
  const buffer = Buffer.from(base64Data, 'base64');
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    contentType: 'image/jpeg',
    metadata: { cacheControl: 'public, max-age=31536000' },
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

function buildImagePrompt(post, brandProfile) {
  const platform = post.platform || 'social media';
  const visualDesc = post.visualDescription || post.visual || '';
  if (!visualDesc) return null;

  const toneContext = brandProfile?.toneSignals?.length
    ? `Style: ${brandProfile.toneSignals.slice(0, 3).join(', ')}.`
    : '';

  return `Social media image for ${platform}. ${visualDesc} ${toneContext} High quality, vibrant, professional, suitable for ${platform}. No text overlays. No logos. No watermarks.`.trim();
}

async function generateImagesForCalendar(posts, clientId, calendarId, brandProfile = null) {
  const BATCH_SIZE = 5;
  const results = [...posts];

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (post, batchIndex) => {
        const globalIndex = i + batchIndex;
        const day = post.day || globalIndex + 1;
        const prompt = buildImagePrompt(post, brandProfile);
        if (!prompt) return { index: globalIndex, imageUrl: null };

        const storagePath = `clients/${clientId}/calendars/${calendarId}/day-${day}.jpg`;
        const base64 = await generateImageBase64(prompt);
        const imageUrl = await uploadImageToStorage(base64, storagePath);
        return { index: globalIndex, imageUrl };
      })
    );

    batchResults.forEach((result, batchIndex) => {
      const globalIndex = i + batchIndex;
      if (result.status === 'fulfilled' && result.value.imageUrl) {
        results[globalIndex] = { ...posts[globalIndex], imageUrl: result.value.imageUrl };
      } else {
        if (result.status === 'rejected') {
          logger.warn(`Image generation failed for post ${globalIndex}:`, result.reason?.message);
        }
        results[globalIndex] = { ...posts[globalIndex], imageUrl: null };
      }
    });
  }

  return results;
}

module.exports = { generateImagesForCalendar };
