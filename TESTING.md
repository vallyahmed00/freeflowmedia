# Testing Guide - Drift Studio

## 🚀 Quick Start

The development server is now running. Open your browser and visit:
**http://localhost:5173**

---

## 🎯 New Features Added

### 1. **Demo Mode** 
Demo mode lets you explore the platform with sample data - no API keys or backend required!

#### How to Activate:
1. Visit the homepage
2. Click the purple banner at the top: "Try Demo"
3. OR visit directly: http://localhost:5173/leads

#### What's Included:
- ✅ 6 sample leads with realistic data
- ✅ Full lead management (view, edit, delete)
- ✅ Search and filter functionality
- ✅ Export to CSV/JSON
- ✅ Demo mode indicator banner

#### How to Exit:
- Click "Exit Demo" button in the demo banner on the leads page
- OR clear localStorage: `localStorage.removeItem('demo-mode')`

---

### 2. **Apify Lead Generator** (Live Mode)

To test the real Apify lead generator (not demo mode):

#### Prerequisites:
- ✅ Apify API key is already configured in `src/firebase/config.js`
- ✅ You need a backend server running at `http://localhost:8000/api` (see below)

#### Backend Server Setup:
The lead generator uses the Apify API through a backend proxy. If you don't have the backend running:

**Option 1: Use Demo Mode** (Recommended for testing UI)
- Just click "Try Demo" from the homepage banner

**Option 2: Set Up Backend**
1. The `leadApi.js` service points to `http://localhost:8000/api`
2. You need to create/start your Python FastAPI backend
3. The backend should proxy requests to Apify API

#### Testing Lead Generation:
1. Exit demo mode if active
2. Go to http://localhost:5173/leads
3. Click "Generate Leads" button
4. Enter search parameters:
   - **Query**: e.g., "restaurants", "digital marketing agency", "fitness gyms"
   - **Location**: e.g., "Cape Town", "Johannesburg"
   - **Industry**: e.g., "Technology", "Food"
5. Click "Generate"
6. Wait for Apify to scrape results (may take 30-60 seconds)
7. New leads will appear in your dashboard

---

### 3. **Social Proof Notifications**

Animated notifications appear at the bottom-left showing:
- Leads generated
- Client ROI
- Campaign success rates
- Automation savings

**Features:**
- ✅ Auto-rotating every 8 seconds
- ✅ Dismissible (click X)
- ✅ Reappears after 30 seconds if dismissed

---

### 4. **Back to Top Button**

- Appears when you scroll down 300px
- Smooth scroll animation to top
- Purple gradient with hover effects
- Fixed position at bottom-right

---

### 5. **Trust Badges**

Located on the homepage between stats and testimonials:
- 6 sample client brands
- Hover effects with purple gradient
- Industries displayed

---

### 6. **Demo Mode Banner**

Fixed banner at the top of the site:
- Compact and expanded views
- Shows platform stats
- Quick links to demo tools
- Dismissible

---

## 🧪 Testing Checklist

### Homepage (`/`)
- [ ] Hero section loads with animations
- [ ] Stats section displays correctly
- [ ] Trust badges section visible
- [ ] Testimonials load
- [ ] E-commerce services grid
- [ ] CTA section buttons work
- [ ] Back to top button appears on scroll
- [ ] Social proof notifications appear (~5 seconds)
- [ ] Demo banner visible at top

### Lead Generator (`/leads`)
- [ ] **Demo Mode**: Sample leads load
- [ ] Search functionality works
- [ ] Status filter dropdown works
- [ ] Export to CSV works
- [ ] Export to JSON works
- [ ] Click lead to view details
- [ ] Edit lead functionality
- [ ] Delete lead functionality
- [ ] Add new lead modal
- [ ] Demo mode indicator banner
- [ ] Exit demo button works

### Lead Generation Modal
- [ ] Opens when clicking "Generate Leads"
- [ ] Form validation works
- [ ] **Demo Mode**: Shows message about sample data
- [ ] **Live Mode**: Attempts Apify API call

### Navigation
- [ ] All navbar links work
- [ ] Mobile hamburger menu works
- [ ] Routes load correctly
- [ ] Scroll to top on route change

### Other Pages
- [ ] `/about` - About page loads
- [ ] `/work` - Work page loads
- [ ] `/pricing` - Pricing page with tabs
- [ ] `/automation` - Automation page loads
- [ ] `/marketing-generator` - Content Ideator (hidden nav/footer)
- [ ] `/client-portal` - Client portal (requires auth)

---

## 🐛 Known Issues to Be Aware Of

1. **Apify API May Fail** - If no backend server at localhost:8000
   - **Solution**: Use demo mode or set up the backend proxy

2. **EmailJS Not Configured** - Contact form uses placeholder credentials
   - **Solution**: Configure EmailJS or use n8n webhook

3. **n8n Webhook at Localhost** - Points to localhost:5678
   - **Solution**: Update to production n8n URL

4. **Yoco Payments Mock** - Payment gateway is simulated
   - **Solution**: Integrate real Yoco SDK

5. **Firestore Rules Expiring** - Rules expire May 10, 2026
   - **Solution**: Update rules before expiration

---

## 📊 Apify API Status

**Current Configuration:**
- ✅ API Key: Configured in `src/firebase/config.js`
- ⚠️ Backend Proxy: Not running (localhost:8000)
- ✅ Fallback: Demo mode with sample data

**To Test Real Lead Generation:**

You have two options:

### Option A: Quick Test (Demo Mode)
```javascript
// In browser console:
localStorage.setItem('demo-mode', 'true');
window.location.href = '/leads';
```

### Option B: Real Apify Test (Requires Backend)

Create a simple Python FastAPI backend:

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

APIFY_API_KEY = "apify_api_g8pXbduM9sSQvz6TJ0WQnde9UEcUzT170xJW"

@app.post("/api/search")
async def search_leads(params: dict):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.apify.com/v2/acts/your-actor/runs",
            headers={"Authorization": f"Bearer {APIFY_API_KEY}"},
            json=params
        )
        return response.json()

@app.get("/api/leads")
async def get_leads():
    # Return leads from your database
    return []
```

Run it:
```bash
pip install fastapi uvicorn httpx
uvicorn main:app --reload --port 8000
```

---

## 🎨 Visual Features to Test

1. **Three.js Background** - Animated 3D shapes (torus, octahedron)
2. **Glassmorphism Cards** - Frosted glass effect with blur
3. **Purple Gradient Theme** - #9333EA to #C084FC
4. **Framer Motion Animations** - Smooth transitions on scroll
5. **Mobile Responsive** - Test on different screen sizes

---

## 📱 Mobile Testing

Open browser DevTools and test:
- iPhone SE (375x667)
- iPhone 12 Pro (390x844)
- iPad (768x1024)
- Samsung Galaxy S20 (360x800)

**Check:**
- [ ] Navbar collapses to hamburger
- [ ] Touch targets are large enough
- [ ] Text is readable
- [ ] No horizontal scroll
- [ ] Forms are usable

---

## 🔧 Useful Browser Console Commands

```javascript
// Enable demo mode
localStorage.setItem('demo-mode', 'true');
location.reload();

// Disable demo mode
localStorage.removeItem('demo-mode');
location.reload();

// Check current demo mode status
console.log('Demo mode:', localStorage.getItem('demo-mode'));

// Clear all local storage
localStorage.clear();
location.reload();
```

---

## 🚀 Deploy to Production

When ready to deploy:

```bash
# Build and deploy
./deploy.sh

# Or manually
npm run build
firebase deploy
```

**Before deploying, update:**
1. Google Analytics ID in `index.html` (replace G-FREEFLOW)
2. n8n webhook URL to production
3. EmailJS credentials
4. Integrate real Yoco payments
5. Update Firestore security rules

---

## 📞 Need Help?

- Check README.md for project documentation
- See TODO.md for pending tasks
- Check FIREBASE_SETUP.md for Firebase configuration

---

**Enjoy testing! 🎉**
