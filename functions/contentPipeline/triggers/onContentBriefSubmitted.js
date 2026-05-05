const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { generateContentCalendar } = require('../services/aiService');
const { reviewCalendar } = require('../services/brandSafetyService');
const { sendCalendarReviewEmail } = require('../services/resendEmailService');
const { generateImagesForCalendar } = require('../services/imageGenService');
const { getProfile } = require('../services/brandDnaService');

// Retrieve the initialized admin db instance
const db = admin.firestore();

exports.onContentBriefSubmitted = onDocumentCreated({
    document: 'contentBriefs/{briefId}',
    secrets: ['GEMINI_API_KEY']
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error('No data associated with the event');
    return;
  }

  const briefData = snapshot.data();
  const briefId = event.params.briefId;
  const clientId = briefData.clientId;

  try {
    logger.info(`Processing new content brief for client: ${clientId}`);

    // Fetch client details to get email and name if not fully present in brief
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
        throw new Error(`Client document not found for ID: ${clientId}`);
    }
    const clientData = clientDoc.data();

    // 2. Extract specific fields for the AI prompt
    const aiParams = {
        businessName: briefData.businessName || clientData.name,
        industry: briefData.industry,
        targetAudience: briefData.targetAudience,
        campaignGoal: briefData.campaignGoal,
        platforms: briefData.platforms,
        tone: briefData.tone,
        contentRequirements: briefData.contentRequirements
    };

    // 3 & 4. Call AI to generate calendar using CONTENT CALENDAR PROMPT
    logger.info('Generating 30-day content calendar via Gemini...');
    const rawCalendar = await generateContentCalendar(aiParams, clientId);

    // 4b. Run brand safety review — auto-regenerates posts scoring below 7/10
    logger.info('Running brand safety review...');
    const clientContext = {
      businessName: aiParams.businessName,
      industry: aiParams.industry,
      targetAudience: aiParams.targetAudience,
      tone: aiParams.tone,
    };
    const rawPosts = Array.isArray(rawCalendar) ? rawCalendar : (rawCalendar?.posts || []);
    const { posts: safePosts, report: safetyReport } = await reviewCalendar(rawPosts, clientContext);
    const generatedCalendar = Array.isArray(rawCalendar)
      ? safePosts
      : { ...rawCalendar, posts: safePosts, safetyReport };

    // 6. Generate a unique approval link pointing to the Cloud Function endpoint
    const approvalToken = crypto.randomUUID();
    const approvalLink = `https://us-central1-freeflow-media.cloudfunctions.net/approveContent/${approvalToken}`;

    // 5 & 7. Save generated calendar to ContentCalendar collection with status "awaiting_approval"
    // Pre-generate the calendar document ID so we can use it for storage paths
    const calendarRef = db.collection('contentCalendar').doc();

    // Generate images for each post (non-blocking on failure)
    let calendarWithImages = generatedCalendar;
    try {
      const rawPosts = Array.isArray(generatedCalendar)
        ? generatedCalendar
        : (generatedCalendar?.posts || []);
      const brandProfile = await getProfile(clientId);
      const postsWithImages = await generateImagesForCalendar(rawPosts, clientId, calendarRef.id, brandProfile);
      calendarWithImages = Array.isArray(generatedCalendar)
        ? postsWithImages
        : { ...generatedCalendar, posts: postsWithImages };
    } catch (imgErr) {
      logger.warn('Image generation skipped:', imgErr.message);
    }

    await calendarRef.set({
        briefId: briefId,
        clientId: clientId,
        calendarData: calendarWithImages,
        status: 'awaiting_approval',
        approvalToken: approvalToken,
        approvalLink: approvalLink,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    logger.info(`Saved new calendar with ID: ${calendarRef.id}`);

    // Extract first 3 posts for preview
    let previewPosts = [];
    if (Array.isArray(generatedCalendar)) {
        previewPosts = generatedCalendar.slice(0, 3);
    } else if (generatedCalendar.posts && Array.isArray(generatedCalendar.posts)) {
        previewPosts = generatedCalendar.posts.slice(0, 3);
    } else if (generatedCalendar.calendar && Array.isArray(generatedCalendar.calendar)) {
        previewPosts = generatedCalendar.calendar.slice(0, 3);
    } else {
        // Fallback preview if structure is unexpected
        previewPosts = [
            { type: 'Day 1 Post', description: 'Initial campaign launch post' },
            { type: 'Day 2 Post', description: 'Engagement and value-driven post' },
            { type: 'Day 3 Post', description: 'Interactive community question' }
        ];
    }

    // 8. Send client an email via Resend with preview and dark theme
    logger.info('Sending calendar review email...');
    await sendCalendarReviewEmail(clientData.email, clientData.name, previewPosts, approvalLink);

    // 9. Update ContentBriefs document with status
    await db.collection('contentBriefs').doc(briefId).update({
        status: 'calendar_generated',
        calendarId: calendarRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    logger.info(`Successfully processed brief: ${briefId}`);

  } catch (error) {
    logger.error(`Error in onContentBriefSubmitted for brief ${briefId}:`, error);
    await db.collection('contentBriefs').doc(briefId).update({
        status: 'generation_failed',
        error: error.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
});
