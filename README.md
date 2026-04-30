# Drift Studio | Digital Marketing Agency

> **Command the Digital Space** - Data-driven SEO, scroll-stopping social media, and high-converting PPC campaigns.

[🌐 Live Site](https://freeflowmedia.com)

## 🚀 About

Drift Studio is a premium digital marketing agency website with integrated AI-powered marketing tools. We help brands dominate their market through:

- **SEO** - Data-driven search engine optimization
- **Social Media** - Scroll-stopping content that engages
- **PPC** - High-converting pay-per-click campaigns
- **Web Development** - Premium, conversion-focused websites
- **Automation** - Streamlined marketing workflows

## ✨ Features

### Public Pages
| Route | Description |
|-------|-------------|
| `/` | Homepage with animated stats, testimonials, and services |
| `/about` | Company mission and values |
| `/work` | Three-step process showcase (Discovery → Strategy → Execution) |
| `/pricing` | Three-tier pricing: Ignite, Momentum, Apex |
| `/automation` | Business automation benefits and use cases |

### AI-Powered Tools
| Route | Description |
|-------|-------------|
| `/marketing-generator` | **Content Ideator** - AI-powered marketing strategy generator (Google Gemini 2.5 Pro) |
| `/leads` / `/generate` | **Lead Generator** - AI-powered lead discovery and management (Apify API) |
| `/client-portal` | **Client Portal** - Authenticated dashboard for campaign tracking |

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 19, Vite, React Router 7 |
| **Animations** | Framer Motion, Three.js (react-three-fiber) |
| **UI** | Custom CSS with glassmorphism, Lucide Icons |
| **Backend** | Firebase (Auth, Firestore, Storage, Functions) |
| **AI** | Google Gemini 2.5 Pro |
| **Lead Gen** | Apify API |
| **Payments** | Yoco (South Africa) |
| **Automation** | n8n webhooks |
| **Deployment** | Firebase Hosting |

## 📦 Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Auth, Firestore, and Functions enabled

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd freeflow-media

# 2. Install dependencies
npm install

# 3. Set up Firebase
# Copy the template and add your Firebase config
cp firebase-template.js firebase-config.js
# Edit firebase-config.js with your Firebase project credentials

# 4. Start development server
npm run dev
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Firebase Configuration (from Firebase Console)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Apify API Key (from https://console.apify.com)
APIFY_API_KEY=your_apify_api_key

# EmailJS (for contact form fallback)
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key

# n8n Webhook URL
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/freeflow-lead
```

### Development

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

### Deployment

```bash
# Full deployment (build + Firebase deploy + git push)
./deploy.sh

# Watch mode deployment
./watch-deploy.sh
```

## 🏗 Project Structure

```
freeflow-media/
├── src/
│   ├── main.jsx                    # Entry point
│   ├── App.jsx                     # Router & lazy loading
│   ├── index.css                   # Global styles & theme
│   │
│   ├── firebase/                   # Firebase integration
│   │   ├── config.js               # Firebase initialization
│   │   ├── auth.js                 # Authentication helpers
│   │   └── firestore.js            # Firestore CRUD operations
│   │
│   ├── pages/                      # Route components
│   │   ├── Home.jsx
│   │   ├── About.jsx
│   │   ├── Work.jsx
│   │   ├── Pricing.jsx
│   │   ├── Automation.jsx
│   │   ├── Generator.jsx           # Lead Generator
│   │   ├── MarketingGenerator.jsx  # Content Ideator
│   │   ├── ClientPortal.jsx
│   │   └── NotFound.jsx
│   │
│   ├── components/                 # Reusable components
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── ThreeBackground.jsx     # 3D animated background
│   │   ├── ContactModal.jsx
│   │   ├── MarketingForm.jsx
│   │   ├── PaymentGateway.jsx
│   │   ├── StrategyDashboard.jsx
│   │   ├── LeadCard.jsx
│   │   ├── LeadDetailModal.jsx
│   │   ├── LeadFormModal.jsx
│   │   ├── LeadGeneratorModal.jsx
│   │   └── ErrorBoundary.jsx
│   │
│   └── services/
│       └── leadApi.js              # Lead management API client
│
├── public/                         # Static assets
├── firebase.json                   # Firebase hosting config
├── firestore.rules                 # Database security rules
├── n8n-marketing-workflow.json    # n8n automation workflow
└── vite.config.js                  # Vite configuration
```

## 🔧 Configuration

### Firebase Setup

1. **Create a Firebase Project** at [Firebase Console](https://console.firebase.google.com)
2. **Enable Authentication** (Email/Password provider)
3. **Create Firestore Database** (start in test mode, then update rules)
4. **Deploy Cloud Functions** (for AI strategy generation):
   ```bash
   cd functions
   npm install
   # Add Gemini API key to functions config
   firebase functions:config:set gemini.api_key="YOUR_GEMINI_KEY"
   firebase deploy --only functions
   ```
5. **Update Firestore Rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions.

### Apify Integration

1. Create an account at [Apify](https://apify.com)
2. Get your API key from [Console](https://console.apify.com/account#/integrations)
3. Add it to your `.env` file or Firebase config as `APIFY_API_KEY`

### n8n Automation

1. Set up an [n8n instance](https://n8n.io)
2. Import the workflow from `n8n-marketing-workflow.json`
3. Update the webhook URL in your `.env` file

## 🎨 Design System

### Colors
- **Primary**: `#9333EA` (Purple)
- **Background**: `#030014` (Deep space blue)
- **Cards**: Glassmorphism effect with rgba backgrounds
- **Gradients**: Purple to pink (`#9333EA` → `#C084FC`)

### Typography
- Body text: System fonts with 1.6-1.8 line height
- Headings: Bold, tight letter spacing (160-180px tracking)

## 📊 API Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| **Google Gemini 2.5 Pro** | AI strategy generation | ✅ Active (via Cloud Functions) |
| **Apify** | Lead discovery & scraping | ✅ Active |
| **Yoco** | Payment processing (South Africa) | ⚠️ Mock implementation |
| **EmailJS** | Contact form fallback | ⚠️ Needs configuration |
| **n8n** | Marketing automation | ⚠️ Needs setup |

## 🚨 Known Issues

- [ ] Firestore rules expire May 10, 2026
- [ ] Yoco payment gateway needs real integration
- [ ] EmailJS credentials need configuration
- [ ] n8n webhook pointed at localhost

## 📝 TODO

See [TODO.md](./TODO.md) for the full task list.

## 🤝 Contributing

This is a private agency project. For questions or issues, contact the development team.

## 📄 License

Proprietary - Drift Studio © 2026

---

**Built with ❤️ by Drift Studio** | [freeflowmedia.com](https://freeflowmedia.com)
