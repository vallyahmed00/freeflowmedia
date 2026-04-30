# Drift Studio - Firebase Setup Guide

## 🔥 Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Follow the setup wizard
4. Enable Google Analytics (recommended)

### 2. Get Firebase Config
1. In Firebase Console, click the gear icon → Project Settings
2. Scroll to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Copy the config object
5. Paste it into `src/firebase/config.js` replacing the placeholder values

### 3. Enable Authentication
1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** sign-in method
4. (Optional) Enable Google, Apple, etc.

### 4. Set Up Firestore Database
1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Start in **Test Mode** (for development)
4. Choose a location close to your users

### 5. Set Up Storage (Optional)
1. Go to **Storage**
2. Click **Get Started**
3. Start in **Test Mode**

### 6. Deploy Cloud Functions
```bash
# In your terminal
firebase init functions
# Select JavaScript
# Select existing project

cd functions
npm install @google/genai cors
npm install firebase-admin

# Replace functions/index.js with firebase-template.js content

# Set your Gemini API key
firebase functions:secrets:set GEMINI_API_KEY

# Deploy
firebase deploy --only functions
```

### 7. Update Config URLs
In `src/firebase/config.js`:
- Replace `GENERATE_STRATEGY_URL` with your deployed Cloud Function URL
- You can find this in Firebase Console → Functions

---

## 📊 Firestore Database Structure

### Collections to Create:

#### `clients/{clientId}`
```javascript
{
  businessName: "TechFlow Inc.",
  email: "client@example.com",
  plan: "Momentum",
  campaignStats: {
    totalCampaigns: 12,
    activeCampaigns: 3,
    totalLeads: 1847,
    conversionRate: "4.8%",
    roi: "340%"
  },
  createdAt: timestamp
}
```

#### `campaigns/{campaignId}`
```javascript
{
  clientId: "userId123",
  name: "Q1 Social Media Campaign",
  type: "Social Media",
  status: "active", // active, paused, completed
  leads: 150,
  budget: 5000,
  createdAt: timestamp
}
```

#### `leads/{leadId}`
```javascript
{
  clientId: "userId123",
  businessName: "Acme Corp",
  industry: "Technology",
  location: "New York",
  email: "contact@acme.com",
  status: "new", // new, contacted, interested, not_interested, converted
  createdAt: timestamp
}
```

#### `reports/{reportId}`
```javascript
{
  clientId: "userId123",
  name: "Q1 2024 Performance Report",
  type: "PDF", // PDF, Excel
  url: "https://storage.url/report.pdf",
  date: "2024-03-15"
}
```

---

## 🌐 E-commerce Services Added

The website now showcases:

1. **Custom Website Development**
   - Responsive Design
   - SEO-Optimized
   - Performance Tuned
   - CMS Integration

2. **Shopify Development**
   - Custom Themes
   - App Integration
   - Payment Setup
   - Inventory Management

3. **WooCommerce Solutions**
   - Custom Plugins
   - Multi-Currency
   - Shipping Integration
   - Analytics Dashboard

4. **E-commerce Automation**
   - Abandoned Cart Recovery
   - Email Automation
   - Inventory Sync
   - Order Fulfillment

---

## ✅ What's Integrated

### Firebase Services:
- ✅ **Authentication** - Email/Password login for Client Portal
- ✅ **Firestore** - Real-time database for clients, campaigns, leads, reports
- ✅ **Cloud Functions** - AI-powered content generation via Gemini
- ✅ **Storage** - Ready for file uploads (reports, assets)
- ✅ **Analytics** - Google Analytics integrated

### Features:
- ✅ Client Portal with real Firebase Auth
- ✅ Real-time campaign updates via Firestore listeners
- ✅ Marketing Generator connected to Cloud Function (with mock fallback)
- ✅ Web Development & E-commerce services section
- ✅ Shopify & WooCommerce showcase
- ✅ EmailJS fallback for contact forms
- ✅ Export leads to CSV/JSON

---

## 🚀 Deployment

### Deploy to Firebase Hosting:
```bash
firebase init hosting
# Select your project
# Set public directory to: dist

npm run build
firebase deploy
```

### Deploy to Vercel/Netlify:
```bash
# Vercel
vercel

# Netlify
netlify deploy --prod
```

---

## 🔧 Environment Variables (Optional)

Create `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GENERATE_STRATEGY_URL=https://your-region-your-project.cloudfunctions.net/generateStrategy
```

Then update `src/firebase/config.js` to use `import.meta.env.VITE_*`

---

## 📝 Next Steps

1. Replace Firebase config placeholders with real values
2. Set up Firestore security rules
3. Create client accounts in Firebase Auth
4. Add real campaign data to Firestore
5. Deploy Cloud Functions with Gemini API key
6. Set up Firebase Analytics events
7. Configure custom domain in Firebase Hosting

---

## 🆘 Troubleshooting

### Cloud Function not working?
- Check Firebase Console → Functions → Logs
- Ensure `GEMINI_API_KEY` secret is set
- Verify CORS is enabled

### Auth not working?
- Check if Email/Password is enabled in Firebase Console
- Check browser console for error messages
- Verify Firebase config is correct

### Firestore permission errors?
- Update Firestore security rules
- Start in test mode for development
- Set up proper authentication rules for production
