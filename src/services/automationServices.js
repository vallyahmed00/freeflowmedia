/**
 * ========================================================
 * AUTOMATION SERVICES - Frontend Helpers
 * ========================================================
 * 
 * Easy-to-use functions to trigger automations from the UI.
 * All functions call Firebase Cloud Functions.
 */

import { GENERATE_STRATEGY_URL } from '../firebase/config';

const BASE_URL = 'https://us-central1-freeflow-media.cloudfunctions.net';

// ==================== LEAD MANAGEMENT ====================

/**
 * Send Slack/Discord/Teams/Telegram notification for new lead
 * @param {Object} lead - Lead data from contact form
 * @param {Array} platforms - Platforms to notify (default: ['slack', 'discord', 'telegram'])
 * Options: 'slack', 'discord', 'teams', 'telegram', 'email'
 */
export const triggerMultiPlatformNotification = async (lead, platforms = ['slack', 'discord', 'telegram']) => {
  try {
    const response = await fetch(`${BASE_URL}/notifyNewLead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead, platforms })
    });
    return await response.json();
  } catch (error) {
    console.error('Multi-platform notification failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send Slack notification for new lead (legacy function)
 * @param {Object} lead - Lead data from contact form
 */
export const triggerSlackNotification = async (lead) => {
  return triggerMultiPlatformNotification(lead, ['slack']);
};

// Alias for backward compatibility
export const triggerNotification = triggerMultiPlatformNotification;

/**
 * Send confirmation email to lead
 * @param {Object} lead - Lead data from contact form
 */
export const triggerConfirmationEmail = async (lead) => {
  try {
    const response = await fetch(`${BASE_URL}/sendLeadConfirmationEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead })
    });
    return await response.json();
  } catch (error) {
    console.error('Confirmation email failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate AI-powered outreach email for a lead
 * @param {Object} lead - Lead data
 * @returns {string} Generated email content
 */
export const generateOutreachEmail = async (lead) => {
  try {
    const response = await fetch(`${BASE_URL}/generateOutreachEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead })
    });
    const data = await response.json();
    return data.emailContent;
  } catch (error) {
    console.error('Email generation failed:', error);
    return null;
  }
};

// ==================== STRATEGY DELIVERY ====================

/**
 * Email strategy to user
 * @param {string} strategyId - Firebase document ID of strategy
 * @param {string} userEmail - User's email address
 * @param {string} businessName - Business name
 */
export const deliverStrategyViaEmail = async (strategyId, userEmail, businessName) => {
  try {
    const response = await fetch(`${BASE_URL}/deliverStrategyViaEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategyId,
        userEmail,
        businessName
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Strategy delivery failed:', error);
    return { success: false, error: error.message };
  }
};

// ==================== TESTIMONIAL REQUESTS ====================

/**
 * Send testimonial request to a converted lead
 * @param {Object} lead - Lead object with email
 * @param {number} daysSinceConversion - Days since they converted
 */
export const sendTestimonialRequest = async (lead, daysSinceConversion = 7) => {
  try {
    const response = await fetch(`${BASE_URL}/requestTestimonial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead,
        daysSinceConversion
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Testimonial request failed:', error);
    return { success: false, error: error.message };
  }
};

// ==================== LEAD ENRICHMENT ====================

/**
 * Enrich lead data with Apify website scraping
 * @param {string} leadId - Firebase document ID of lead
 * @param {string} website - Website URL to scrape
 */
export const enrichLead = async (leadId, website) => {
  try {
    const response = await fetch(`${BASE_URL}/enrichLeadData`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        website
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Lead enrichment failed:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SOCIAL MEDIA ====================

/**
 * Schedule a social media post via Buffer
 * @param {string} platform - 'instagram', 'facebook', 'linkedin', 'twitter'
 * @param {Object} content - { caption, imageUrl }
 * @param {string} scheduledTime - ISO date string
 * @param {string} accessToken - Buffer profile ID
 */
export const scheduleSocialPost = async (platform, content, scheduledTime, accessToken) => {
  try {
    const response = await fetch(`${BASE_URL}/scheduleSocialPost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform,
        content,
        scheduledTime,
        accessToken
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Social media scheduling failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule post across multiple platforms
 * @param {Object} content - { caption, imageUrl }
 * @param {string} scheduledTime - ISO date string
 * @param {Array} platforms - Array of platform profile IDs
 */
export const scheduleMultiPlatformPost = async (content, scheduledTime, platforms) => {
  const results = [];
  
  for (const [platform, profileId] of Object.entries(platforms)) {
    const result = await scheduleSocialPost(
      platform,
      content,
      scheduledTime,
      profileId
    );
    results.push({ platform, ...result });
  }
  
  return results;
};

// ==================== PAYMENT HANDLING ====================

/**
 * Handle Yoco payment webhook callback
 * @param {Object} paymentData - Payment data from Yoco
 */
export const processPayment = async (paymentData) => {
  try {
    const response = await fetch(`${BASE_URL}/handlePaymentWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    return await response.json();
  } catch (error) {
    console.error('Payment processing failed:', error);
    return { success: false, error: error.message };
  }
};

// ==================== N8N INTEGRATION ====================

/**
 * Send data to n8n webhook
 * @param {Object} data - Data to send to n8n
 * @param {string} eventType - Event type (lead_created, email_sent, etc.)
 */
export const triggerN8nWorkflow = async (data, eventType) => {
  try {
    const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
    if (!N8N_WEBHOOK_URL) {
      console.warn('N8N webhook URL not configured');
      return { success: false, error: 'N8N URL not configured' };
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        eventType,
        timestamp: new Date().toISOString()
      })
    });
    return await response.json();
  } catch (error) {
    console.error('N8N trigger failed:', error);
    return { success: false, error: error.message };
  }
};

// ==================== AUTOMATION SEQUENCES ====================

/**
 * Complete new lead automation sequence:
 * 1. Save to Firebase (done by ContactModal)
 * 2. Send multi-platform notification (Slack/Discord/Teams/Telegram/Email)
 * 3. Send confirmation email
 * 4. Generate AI outreach email
 * 5. Trigger n8n workflow (if configured)
 * 
 * @param {Object} lead - Lead data from contact form
 * @param {Array} platforms - Notification platforms (default: ['slack', 'discord', 'telegram'])
 */
export const runNewLeadAutomation = async (lead, platforms = ['slack', 'discord', 'telegram']) => {
  const results = {
    notifications: null,
    email: null,
    aiEmail: null,
    n8n: null
  };

  // Run all automations in parallel
  const promises = [
    triggerMultiPlatformNotification(lead, platforms).then(r => results.notifications = r),
    triggerConfirmationEmail(lead).then(r => results.email = r),
    generateOutreachEmail(lead).then(r => results.aiEmail = r),
    triggerN8nWorkflow(lead, 'lead_created').then(r => results.n8n = r)
  ];

  await Promise.allSettled(promises);
  
  return results;
};

/**
 * Complete strategy delivery sequence:
 * 1. Save strategy to Firebase (done by MarketingGenerator)
 * 2. Email strategy to user
 * 3. Trigger n8n workflow
 * 
 * @param {string} strategyId - Firebase document ID
 * @param {string} userEmail - User's email
 * @param {string} businessName - Business name
 */
export const runStrategyDelivery = async (strategyId, userEmail, businessName) => {
  const results = {
    email: null,
    n8n: null
  };

  const promises = [
    deliverStrategyViaEmail(strategyId, userEmail, businessName).then(r => results.email = r),
    triggerN8nWorkflow({ strategyId, userEmail }, 'strategy_delivered').then(r => results.n8n = r)
  ];

  await Promise.allSettled(promises);
  
  return results;
};

/**
 * Complete testimonial request sequence:
 * 1. Send testimonial request email
 * 2. Trigger n8n follow-up workflow
 * 
 * @param {Object} lead - Lead object
 * @param {number} daysSinceConversion - Days since conversion
 */
export const runTestimonialRequest = async (lead, daysSinceConversion = 7) => {
  const results = {
    testimonial: null,
    n8n: null
  };

  const promises = [
    sendTestimonialRequest(lead, daysSinceConversion).then(r => results.testimonial = r),
    triggerN8nWorkflow({ lead }, 'testimonial_requested').then(r => results.n8n = r)
  ];

  await Promise.allSettled(promises);
  
  return results;
};

// ==================== HEALTH CHECK ====================

/**
 * Check if all Firebase Functions are accessible
 * @returns {Object} Status of all functions
 */
export const checkAutomationHealth = async () => {
  const functions = [
    'generateStrategy',
    'notifyNewLead',
    'sendLeadConfirmationEmail',
    'generateOutreachEmail',
    'deliverStrategyViaEmail',
    'requestTestimonial',
    'handlePaymentWebhook',
    'enrichLeadData',
    'scheduleSocialPost'
  ];

  const status = {};

  for (const func of functions) {
    try {
      const response = await fetch(`${BASE_URL}/${func}`, {
        method: 'GET'
      });
      status[func] = {
        reachable: true,
        status: response.status
      };
    } catch (error) {
      status[func] = {
        reachable: false,
        error: error.message
      };
    }
  }

  return status;
};
