const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const { createCalendarGoogleDoc } = require('../services/googleDriveService');
const { sendAdminFeedbackEmail, sendApprovalConfirmationEmail } = require('../services/resendEmailService');
const { updateProfileOnApproval } = require('../services/brandDnaService');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = admin.firestore();

// Helper to fetch calendar by token and check validity
const getCalendarByToken = async (token) => {
  const snapshot = await db.collection('contentCalendar').where('approvalToken', '==', token).limit(1).get();
  if (snapshot.empty) return { error: 'not_found' };
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  
  // Check if link has already been used
  if (data.status !== 'awaiting_approval') {
    return { error: 'used', status: data.status };
  }
  
  // Check expiry (72 hours)
  const createdAt = data.createdAt.toDate();
  const now = new Date();
  const diffHours = Math.abs(now - createdAt) / 36e5;
  if (diffHours > 72) return { error: 'expired' };
  
  return { doc, data };
};

// GET Route: Render the beautiful preview page
app.get('/:token', async (req, res) => {
  const { token } = req.params;
  const result = await getCalendarByToken(token);
  
  if (result.error) {
    let message = 'This link is invalid or has expired.';
    if (result.error === 'used') {
      message = result.status === 'approved' 
        ? 'This calendar has already been approved! 🎉'
        : 'Feedback for this calendar has already been submitted.';
    } else if (result.error === 'expired') {
      message = 'This link has expired after 72 hours. Please request a new one.';
    }

    return res.status(400).send(`
      <html>
      <head><title>Drift Studio - Error</title><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="bg-gray-900 text-gray-200 min-h-screen flex items-center justify-center font-sans">
        <div class="max-w-md w-full bg-gray-800 p-8 rounded-xl border border-gray-700 text-center shadow-2xl">
          <h2 class="text-2xl font-bold text-red-400 mb-4">Link Unavailable</h2>
          <p class="text-gray-400">${message}</p>
        </div>
      </body>
      </html>
    `);
  }

  const { data, doc } = result;
  const posts = Array.isArray(data.calendarData) ? data.calendarData : (data.calendarData.posts || data.calendarData.calendar || []);
  
  // Fetch brief and client info for display
  const briefDoc = await db.collection('contentBriefs').doc(data.briefId).get();
  const clientDoc = await db.collection('clients').doc(data.clientId).get();
  const clientData = clientDoc.data() || {};
  const businessName = briefDoc.exists ? (briefDoc.data().businessName || clientData.name) : clientData.name;

  // Generate HTML for posts
  let postsHtml = '';
  posts.forEach((post, i) => {
    const platform = post.platform || post.type || 'Social';
    const content = post.description || post.visual || post.hook || post.content || '';
    const visual = post.visualDescription || post.visual || 'N/A';
    const hashtags = post.hashtags || '';
    const date = post.date || post.scheduledDate || `Day ${i + 1}`;
    const imageUrl = post.imageUrl || null;

    let platformIcon = '📱';
    if (platform.toLowerCase().includes('instagram')) platformIcon = '📸';
    if (platform.toLowerCase().includes('facebook')) platformIcon = '📘';
    if (platform.toLowerCase().includes('tiktok')) platformIcon = '🎵';

    postsHtml += `
      <div class="bg-gray-800 p-6 rounded-xl border-l-4 border-purple-600 shadow-lg mb-6">
        <div class="flex items-center justify-between mb-4">
          <span class="text-purple-400 font-semibold text-lg">${platformIcon} ${platform}</span>
          <span class="text-gray-400 text-sm bg-gray-900 px-3 py-1 rounded-full">${date}</span>
        </div>
        <div class="space-y-3">
          ${imageUrl ? `
          <div>
            <img src="${imageUrl}" alt="AI-generated visual for day ${i + 1}"
              style="width:100%;border-radius:8px;object-fit:cover;max-height:300px;margin-bottom:0.5rem;"
              loading="lazy" />
          </div>` : ''}
          <div>
            <h4 class="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Caption / Content</h4>
            <p class="text-gray-200 text-sm">${content}</p>
          </div>
          <div>
            <h4 class="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Visual Direction</h4>
            <p class="text-gray-300 text-sm italic">${visual}</p>
          </div>
          ${hashtags ? `
          <div>
            <h4 class="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Hashtags</h4>
            <p class="text-purple-300 text-xs">${hashtags}</p>
          </div>` : ''}
        </div>
      </div>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Review Your Content - Drift Studio</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { background-color: #0B0F19; } /* Drift dark theme */
      </style>
    </head>
    <body class="text-gray-200 font-sans antialiased min-h-screen pb-20">
      
      <!-- Header -->
      <header class="bg-gray-900 border-b border-gray-800 py-6 sticky top-0 z-10 shadow-md">
        <div class="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-white tracking-tight">Drift<span class="text-purple-500">Studio</span></h1>
            <p class="text-sm text-gray-400 mt-1">Content Calendar Review: <span class="text-purple-300 font-semibold">${businessName}</span></p>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-4xl mx-auto px-6 mt-10">
        <div class="mb-10 text-center">
          <h2 class="text-3xl font-bold text-white mb-3">Your 30-Day Strategy is Ready</h2>
          <p class="text-gray-400 max-w-2xl mx-auto">Please review the AI-generated content below. Once approved, this will be sent to our designers and scheduled automatically to your integrated platforms.</p>
        </div>

        <div class="space-y-6">
          ${postsHtml}
        </div>

        <!-- Action Area -->
        <div class="mt-12 bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
          <h3 class="text-xl font-bold text-white mb-6 text-center">What would you like to do?</h3>
          
          <div id="action-buttons" class="flex flex-col sm:flex-row gap-4 justify-center">
            <button onclick="approveContent()" class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg shadow-purple-500/30 flex-1 sm:flex-none">
              Approve All & Schedule 🎉
            </button>
            <button onclick="showFeedbackForm()" class="bg-transparent border-2 border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white font-bold py-3 px-8 rounded-lg transition-colors flex-1 sm:flex-none">
              Request Changes
            </button>
          </div>

          <!-- Feedback Form (Hidden by default) -->
          <div id="feedback-form" class="hidden mt-8">
            <h4 class="text-lg font-semibold text-gray-200 mb-2">What should we change?</h4>
            <textarea id="feedback-text" rows="4" class="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g. Please use a more professional tone, and focus more on our new summer collection..."></textarea>
            <div class="mt-4 flex justify-end gap-3">
              <button onclick="hideFeedbackForm()" class="text-gray-400 hover:text-white px-4 py-2">Cancel</button>
              <button onclick="submitFeedback()" class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">Send Feedback</button>
            </div>
          </div>
        </div>
      </main>

      <script>
        const token = '${token}';
        
        function showFeedbackForm() {
          document.getElementById('action-buttons').classList.add('hidden');
          document.getElementById('feedback-form').classList.remove('hidden');
        }
        
        function hideFeedbackForm() {
          document.getElementById('feedback-form').classList.add('hidden');
          document.getElementById('action-buttons').classList.remove('hidden');
        }

        async function approveContent() {
          if(!confirm('Are you sure you want to approve this calendar? It will be scheduled immediately.')) return;
          
          try {
            const res = await fetch(\`./${token}/approve\`, { method: 'POST' });
            if (res.ok) {
              document.body.innerHTML = \`
                <div class="min-h-screen flex items-center justify-center bg-[#0B0F19]">
                  <div class="text-center p-10 bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl max-w-md">
                    <div class="text-6xl mb-4">🎉</div>
                    <h2 class="text-2xl font-bold text-white mb-2">Your content is scheduled!</h2>
                    <p class="text-gray-400">We've saved the final copy to your Drive and sent you a confirmation email.</p>
                  </div>
                </div>
              \`;
            } else {
              alert('Something went wrong. Please try again.');
            }
          } catch(err) { alert('Error processing approval.'); }
        }

        async function submitFeedback() {
          const feedback = document.getElementById('feedback-text').value;
          if(!feedback.trim()) return alert('Please enter your feedback.');

          try {
            const res = await fetch(\`./${token}/request-changes\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ feedback })
            });
            if (res.ok) {
              document.body.innerHTML = \`
                <div class="min-h-screen flex items-center justify-center bg-[#0B0F19]">
                  <div class="text-center p-10 bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl max-w-md">
                    <div class="text-5xl mb-4 text-purple-500">✍️</div>
                    <h2 class="text-2xl font-bold text-white mb-2">Your feedback has been sent!</h2>
                    <p class="text-gray-400">We'll update your calendar and notify you shortly.</p>
                  </div>
                </div>
              \`;
            } else {
              alert('Something went wrong. Please try again.');
            }
          } catch(err) { alert('Error submitting feedback.'); }
        }
      </script>
    </body>
    </html>
  `;
  
  res.status(200).send(html);
});

// POST Route: Approve Content
app.post('/:token/approve', async (req, res) => {
  const { token } = req.params;
  const result = await getCalendarByToken(token);
  if (result.error) return res.status(400).json({ error: result.error });

  const { doc: calendarDoc, data } = result;

  try {
    // 1. Update ContentCalendar status to "approved"
    await calendarDoc.ref.update({
      status: 'approved',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Update ContentBrief status to "completed"
    await db.collection('contentBriefs').doc(data.briefId).update({
      status: 'completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Save the full calendar as a Google Doc to the client's Drive folder
    const clientDoc = await db.collection('clients').doc(data.clientId).get();
    const clientData = clientDoc.data() || {};

    // Update Brand DNA profile — non-blocking
    const clientName = clientData.name || '';
    updateProfileOnApproval(data.clientId, clientName)
      .catch(err => console.warn('Brand DNA approval update failed:', err.message));
    
    if (clientData.googleDriveFolderId) {
      const monthYear = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
      await createCalendarGoogleDoc(
        clientData.googleDriveFolderId, 
        data.calendarData, 
        `Content Calendar - ${monthYear}`
      );
    }

    // 4. Send confirmation email to client
    if (clientData.email) {
      await sendApprovalConfirmationEmail(clientData.email, clientData.name || 'Client');
    }

    // 5. Trigger ScheduleSocialPostsFunction (This will be done via a Firestore trigger on the calendar status update, or we could publish an event here)
    // For now, the Firestore trigger on contentCalendar (status === 'approved') will handle scheduling!

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in approve endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Route: Request Changes
app.post('/:token/request-changes', async (req, res) => {
  const { token } = req.params;
  const { feedback } = req.body;
  
  const result = await getCalendarByToken(token);
  if (result.error) return res.status(400).json({ error: result.error });

  const { doc: calendarDoc, data } = result;

  try {
    // 1. Update Firestore status to "revision_requested"
    await calendarDoc.ref.update({
      status: 'revision_requested',
      clientFeedback: feedback,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('contentBriefs').doc(data.briefId).update({
      status: 'revision_requested',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Email admin with the feedback
    const clientDoc = await db.collection('clients').doc(data.clientId).get();
    const clientName = clientDoc.exists ? clientDoc.data().name : 'Unknown Client';
    
    await sendAdminFeedbackEmail(clientName, feedback);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in request-changes endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exports.approveContent = onRequest({ cors: true }, app);
