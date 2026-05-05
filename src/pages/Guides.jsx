import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FileText, Search, Settings2, LayoutDashboard, Zap, Link2, ChevronDown, ChevronUp, Key } from 'lucide-react';

const GUIDES = [
  {
    icon: FileText,
    color: '#9333EA',
    title: 'How to submit a content brief',
    description: 'Get your 30-day AI content calendar started in under 5 minutes.',
    steps: [
      'Navigate to Submit Brief from the home page or your client portal.',
      'Fill in your business name, industry, target audience, and campaign goal.',
      'Select which platforms you want content for: Instagram, Facebook, TikTok, LinkedIn, or X.',
      'Upload brand assets — logos, product photos — to help the AI match your visual style (optional).',
      'Click Submit. You\'ll get a confirmation email and your calendar review link within minutes.',
    ],
  },
  {
    icon: FileText,
    color: '#A855F7',
    title: 'How to review and approve your calendar',
    description: 'Review every post before anything goes live — one click approves the whole month.',
    steps: [
      'Open the review link emailed to you after brief submission.',
      'Browse each post: caption, AI-generated image, visual direction, hashtags, and scheduled time.',
      'If everything looks good, click "Approve All & Schedule" — all posts queue immediately.',
      'Your calendar is saved automatically to your Google Drive folder as a Google Doc.',
      'You\'ll receive a confirmation email once scheduling is complete.',
    ],
  },
  {
    icon: Settings2,
    color: '#C084FC',
    title: 'How to request revisions',
    description: 'Not quite right? Tell the AI what to change — in plain English.',
    steps: [
      'On the calendar review page, click "Request Changes".',
      'Type your feedback in plain English, e.g. "use a more professional tone and avoid emojis".',
      'Click Send Feedback. The AI re-generates your calendar using your feedback within minutes.',
      'You\'ll receive a new review link by email.',
      'You have up to 3 revision rounds per calendar. Each one makes the AI smarter about your brand.',
    ],
  },
  {
    icon: Search,
    color: '#9333EA',
    title: 'How to use the Price Intelligence tool',
    description: 'Get a full competitor pricing analysis for your industry in minutes.',
    steps: [
      'Navigate to Price Intelligence from the Tools menu.',
      'Enter your business type, your location, and up to 3 competitor names.',
      'Pay the once-off R149 fee via card or EFT.',
      'Receive a full report: competitor pricing tiers, market benchmarks, and your recommended price positioning.',
      'The report is emailed to you and available in your account.',
    ],
  },
  {
    icon: LayoutDashboard,
    color: '#A855F7',
    title: 'How to read your Client Portal dashboard',
    description: 'Your live campaign hub — see exactly what\'s queued, published, and coming next.',
    steps: [
      'Log in at /client-portal with your email and password.',
      'The Dashboard tab shows active campaigns, total posts queued, and total posts published.',
      'The Calendars tab shows all your content calendars with their current status (awaiting approval, approved, scheduled).',
      'The Upcoming Posts tab previews the next 5 posts with captions, platform badges, and scheduled times.',
      'Click any post card to expand the full caption, image, and hashtags.',
    ],
  },
  {
    icon: Zap,
    color: '#C084FC',
    title: 'How to use the Marketing Strategy Generator',
    description: 'Generate a full AI marketing strategy report for your business in one go.',
    steps: [
      'Navigate to Strategy Generator from the Tools menu or home page.',
      'Fill in your business details, target audience, and what marketing you\'re currently doing.',
      'Add any promotional specials or seasonal campaigns you want included.',
      'Pay the once-off R99 fee — or enter a promo code to skip payment.',
      'Your strategy report is generated in about 60 seconds and displayed on screen.',
    ],
  },
  {
    icon: Key,
    color: '#9333EA',
    title: 'How to connect your social media accounts',
    description: 'Give Drift Studio permission to publish to your accounts automatically.',
    steps: [
      'Instagram & Facebook: Go to Meta Business Suite (business.facebook.com) → Settings → System Users → Generate token → select your Page and Instagram account → copy the token → paste it in Drift Studio account settings.',
      'TikTok: Go to TikTok for Business (ads.tiktok.com) → Developer Portal → My Apps → Create App → copy the API key and secret → paste in Drift Studio account settings.',
      'LinkedIn: Go to LinkedIn Developer Portal (developer.linkedin.com) → My Apps → Create App → Products → Request "Share on LinkedIn" access → copy Client ID and Secret → paste in Drift Studio account settings.',
      'X (Twitter): Go to developer.x.com → Projects & Apps → your app → Keys and Tokens → copy the Bearer Token → paste in Drift Studio account settings.',
      'All credentials are encrypted at rest. Drift Studio never stores your personal login password.',
    ],
  },
];

const GuideCard = ({ guide, index }) => {
  const [open, setOpen] = useState(false);
  const Icon = guide.icon;

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${open ? guide.color : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '1.5rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          background: `${guide.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} color={guide.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{guide.title}</p>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{guide.description}</p>
        </div>
        {open
          ? <ChevronUp size={18} color={guide.color} style={{ flexShrink: 0 }} />
          : <ChevronDown size={18} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <ol style={{ margin: '1rem 0 0', padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {guide.steps.map((step, i) => (
                  <li key={i} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function Guides() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-container">
      <div className="container" style={{ paddingTop: '8rem', paddingBottom: '6rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h1 style={{ marginBottom: '1rem' }}>Help &amp; <span className="gradient-text">Guides</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto' }}>
            Step-by-step walkthroughs for every Drift Studio feature. Click any guide to expand it.
          </p>
        </div>

        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {GUIDES.map((guide, i) => (
            <GuideCard key={i} guide={guide} index={i} />
          ))}
        </div>

      </div>
    </motion.div>
  );
}
