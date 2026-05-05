const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { generateContentCalendar } = require('../services/aiService');
const { sendCalendarReviewEmail } = require('../services/resendEmailService');
const { updateProfileOnRevision, getProfile } = require('../services/brandDnaService');
const { generateImagesForCalendar } = require('../services/imageGenService');

const db = admin.firestore();

/**
 * Fires when a contentCalendar document transitions to status = 'revision_requested'.
 * Re-generates the calendar using the original brief + client feedback, then sends
 * a fresh review email with a new approval token.
 */
exports.onCalendarRevisionRequested = onDocumentUpdated({
  document: 'contentCalendar/{calendarId}',
  secrets: ['GEMINI_API_KEY'],
}, async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Only proceed when status changes to revision_requested
  if (before.status === after.status || after.status !== 'revision_requested') {
    return;
  }

  const calendarId = event.params.calendarId;
  const { briefId, clientId, clientFeedback, revisionCount = 0 } = after;

  // Hard cap: prevent infinite loops
  if (revisionCount >= 3) {
    logger.warn(`Calendar ${calendarId} has reached the max revision limit (3). Escalating to admin.`);
    await event.data.after.ref.update({
      status: 'revision_limit_reached',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  logger.info(`Revision ${revisionCount + 1} requested for calendar ${calendarId}`);

  try {
    // Fetch original brief and client details in parallel
    const [briefSnap, clientSnap] = await Promise.all([
      db.collection('contentBriefs').doc(briefId).get(),
      db.collection('clients').doc(clientId).get(),
    ]);

    if (!briefSnap.exists) throw new Error(`Brief ${briefId} not found`);
    if (!clientSnap.exists) throw new Error(`Client ${clientId} not found`);

    const briefData = briefSnap.data();
    const clientData = clientSnap.data();

    // Update Brand DNA profile with revision feedback (non-blocking)
    updateProfileOnRevision(clientId, clientData.name || briefData.businessName, clientFeedback)
      .catch(err => logger.warn('Brand DNA update failed:', err.message));

    // Re-generate calendar, injecting client feedback into the prompt params
    const aiParams = {
      businessName: briefData.businessName || clientData.name,
      industry: briefData.industry,
      targetAudience: briefData.targetAudience,
      campaignGoal: briefData.campaignGoal,
      platforms: briefData.platforms,
      tone: briefData.tone,
      contentRequirements: briefData.contentRequirements,
      // Revision context appended so the model adjusts based on feedback
      revisionFeedback: clientFeedback,
    };

    logger.info('Re-generating content calendar with client feedback...');
    const revisedCalendar = await generateContentCalendar(aiParams, clientId);

    // Generate fresh approval token
    const newToken = crypto.randomUUID();
    const newApprovalLink = `https://us-central1-freeflow-media.cloudfunctions.net/approveContent/${newToken}`;

    // Build preview from first 3 posts
    let previewPosts = [];
    if (Array.isArray(revisedCalendar)) {
      previewPosts = revisedCalendar.slice(0, 3);
    } else if (Array.isArray(revisedCalendar?.posts)) {
      previewPosts = revisedCalendar.posts.slice(0, 3);
    }

    // Generate images for the revised calendar
    let calendarWithImages = revisedCalendar;
    try {
      const rawPosts = Array.isArray(revisedCalendar)
        ? revisedCalendar
        : (revisedCalendar?.posts || []);
      const brandProfile = await getProfile(clientId);
      const postsWithImages = await generateImagesForCalendar(rawPosts, clientId, calendarId, brandProfile);
      calendarWithImages = Array.isArray(revisedCalendar)
        ? postsWithImages
        : { ...revisedCalendar, posts: postsWithImages };
    } catch (imgErr) {
      logger.warn('Image generation skipped on revision:', imgErr.message);
    }

    // Update the calendar document with the revised content
    await event.data.after.ref.update({
      calendarData: calendarWithImages,
      status: 'awaiting_approval',
      approvalToken: newToken,
      approvalLink: newApprovalLink,
      revisionCount: revisionCount + 1,
      lastRevisedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info('Sending revised calendar review email...');
    await sendCalendarReviewEmail(
      clientData.email,
      clientData.name,
      previewPosts,
      newApprovalLink,
    );

    logger.info(`Revision ${revisionCount + 1} complete for calendar ${calendarId}`);
  } catch (error) {
    logger.error(`Revision failed for calendar ${calendarId}:`, error);
    await event.data.after.ref.update({
      status: 'revision_failed',
      revisionError: error.message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});
