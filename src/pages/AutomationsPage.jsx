import { useState } from 'react';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AutomationsPage.css';

const fadeUp = (delay = 0) => ({
  initial: { y: 40, opacity: 0 },
  whileInView: { y: 0, opacity: 1 },
  viewport: { once: true, margin: '-60px' },
  transition: { delay, duration: 0.55 },
});

const BOTS = [
  {
    icon: '🚀', badge: 'Sales', name: 'Lead Response Bot',
    description: 'Instantly WhatsApps every new enquiry within seconds — before your competitor picks up the phone. Personalised to your brand voice.',
    features: ['Instant WhatsApp reply to new leads', 'Personalised to your business', 'Works 24/7, no manual effort', 'Logs every conversation'],
    price: 'R600', period: '/month',
  },
  {
    icon: '💸', badge: 'Finance', name: 'Invoice Reminder Bot',
    description: 'Automatically chases overdue invoices via WhatsApp and email so you get paid faster without awkward conversations.',
    features: ['Daily overdue invoice scan', 'WhatsApp + email reminders', 'Escalates after 14 days', 'Stops when invoice is paid'],
    price: 'R500', period: '/month',
  },
  {
    icon: '📅', badge: 'Content', name: 'Content Calendar Bot',
    description: 'Every Friday morning, 8 fresh AI-generated content ideas land in your inbox — tailored to your business, audience, and tone.',
    features: ['8 ideas every Friday', 'Platform-specific formats', 'South African context', 'No brief required'],
    price: 'R700', period: '/month',
  },
  {
    icon: '🔔', badge: 'Sales', name: 'Follow-up Nudge Bot',
    description: 'Monitors your lead pipeline and pings you when a lead has gone cold — so no deal slips through the cracks.',
    features: ['Monitors leads daily', 'Discord or WhatsApp alerts', 'Flags leads after 3 days silent', 'Pipeline health summary'],
    price: 'R500', period: '/month',
  },
  {
    icon: '🎉', badge: 'Onboarding', name: 'Client Onboarding Bot',
    description: "When someone becomes a client, a 4-step automated sequence kicks off — welcome message, checklist, reminders — without lifting a finger.",
    features: ['Instant welcome WhatsApp', 'Day 1 onboarding email', 'Automated follow-ups', 'Admin alert if no response'],
    price: 'R600', period: '/month',
  },
  {
    icon: '📊', badge: 'Intelligence', name: 'Competitor Tracker Bot',
    description: 'Every Monday morning, get an AI intelligence briefing on what your competitors are doing — and one specific move to stay ahead of them.',
    features: ['Weekly competitor digest', 'Industry trend analysis', 'Delivered via WhatsApp + email', 'Stored for reference'],
    price: 'R800', period: '/month', isNew: true,
  },
  {
    icon: '💬', badge: 'Sales', name: 'WhatsApp Lead Qualifier',
    description: 'Every new WhatsApp enquiry gets an instant 3-question qualifier. By the time you check your phone, the lead has told you exactly what they need.',
    features: ['Instant qualifier message', 'Captures budget + pain point', 'Works 24/7', 'Logs answers to your CRM'],
    price: 'R900', period: '/month', isNew: true,
  },
  {
    icon: '📄', badge: 'Sales', name: 'Instant Proposal Bot',
    description: 'Mark a lead as qualified and a personalised, branded proposal lands in their inbox within 3 minutes. Most agencies take 3 days.',
    features: ['AI-written tailored proposal', 'Fires the moment lead qualifies', 'Your pricing and services', 'Discord alert when sent'],
    price: 'R700', period: '/month', isNew: true,
  },
  {
    icon: '📈', badge: 'Content', name: 'Trend Alert Bot',
    description: 'Every morning at 7am, a ready-to-post caption based on what\'s trending in South Africa right now drops in your WhatsApp. Post in 30 seconds.',
    features: ['Daily 7am WhatsApp alert', 'SA-specific trending topics', 'Ready-to-post caption included', 'Tailored to your industry'],
    price: 'R600', period: '/month', isNew: true,
  },
  {
    icon: '⭐', badge: 'Reputation', name: 'Reputation Defender Bot',
    description: 'The second a new Google or Facebook review goes up, you get a WhatsApp with a suggested reply already written. Negative reviews handled in minutes.',
    features: ['Instant review notification', 'AI-written suggested reply', 'Handles positive + negative', 'Improves Maps ranking'],
    price: 'R750', period: '/month', isNew: true,
  },
];

export default function AutomationsPage() {
  const [demoName, setDemoName] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [demoError, setDemoError] = useState('');

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    if (!demoName.trim() || !demoPhone.trim()) return;
    setSubmitting(true);
    setDemoError('');
    try {
      await addDoc(collection(db, 'leads'), {
        business_name: demoName.trim(),
        phone: demoPhone.trim(),
        source: 'automations_page_demo',
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch {
      setDemoError('Something went wrong — please try WhatsApp instead.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="automations-page">
      <motion.div className="automations-hero" {...fadeUp()}>
        <h1>Automate Your Business.<br />Grow Without the Grind.</h1>
        <p>Drift Studio builds and runs AI-powered bots for your business — responding to leads instantly, chasing invoices, generating content ideas, and keeping your pipeline moving. All on autopilot.</p>
        <a href="#demo" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2rem', display: 'inline-block' }}>Book a Free Demo</a>
      </motion.div>

      <div className="bots-grid">
        {BOTS.map((bot, i) => (
          <motion.div key={bot.name} className={`bot-card${bot.isNew ? ' bot-card--new' : ''}`} {...fadeUp(i * 0.07)}>
            <div className="bot-card-top">
              <div className="bot-card-icon">{bot.icon}</div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <div className="bot-card-badge">{bot.badge}</div>
                {bot.isNew && <div className="bot-card-new">New</div>}
              </div>
            </div>
            <h3>{bot.name}</h3>
            <p>{bot.description}</p>
            <ul className="bot-card-features">
              {bot.features.map(f => <li key={f}>{f}</li>)}
            </ul>
            <div className="bot-card-price">{bot.price} <span>{bot.period}</span></div>
          </motion.div>
        ))}
      </div>

      <motion.div className="automations-bundle" {...fadeUp(0.1)}>
        <h2>Bundle & Save</h2>
        <p>Get multiple bots for one flat monthly fee. We handle setup, maintenance, and updates.</p>
        <div className="bundle-tiers">
          <div className="bundle-tier">
            <div className="bundle-tier-name">Starter Pack</div>
            <div className="bundle-tier-desc">First 5 bots</div>
            <div className="bundle-price">R2,500 <span>/month</span></div>
            <div className="bundle-saving">Save R400/month</div>
          </div>
          <div className="bundle-tier bundle-tier--featured">
            <div className="bundle-tier-name">Full Suite 👑</div>
            <div className="bundle-tier-desc">All 10 bots</div>
            <div className="bundle-price">R5,500 <span>/month</span></div>
            <div className="bundle-saving">Save R1,150/month</div>
          </div>
          <div className="bundle-tier">
            <div className="bundle-tier-name">Advanced Pack</div>
            <div className="bundle-tier-desc">Last 5 bots</div>
            <div className="bundle-price">R3,250 <span>/month</span></div>
            <div className="bundle-saving">Save R500/month</div>
          </div>
        </div>
        <a href="#demo" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>Get Started</a>
      </motion.div>

      <motion.div className="how-it-works" {...fadeUp(0.1)}>
        <h2>How it works</h2>
        <div className="steps-row">
          {[
            { n: 1, title: 'Sign up', desc: 'Complete our onboarding form — takes 5 minutes. Tell us about your business, audience, and which bots you want.' },
            { n: 2, title: 'We configure', desc: "Our team sets up your bots within 48 hours. You don't touch any code or dashboards." },
            { n: 3, title: 'Bots run', desc: 'Your automations go live. Leads get instant replies, invoices get chased, content ideas arrive every Friday.' },
          ].map((step, i) => (
            <motion.div key={step.n} className="step-item" {...fadeUp(i * 0.1)}>
              <div className="step-number">{step.n}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div className="demo-section" id="demo" {...fadeUp(0.1)}>
        <h2>Book a Free 15-Minute Demo</h2>
        <p>See the bots in action. Enter your details and we'll WhatsApp you to set up a call.</p>
        {submitted ? (
          <p className="demo-success">Got it! We'll WhatsApp you shortly to book your demo.</p>
        ) : (
          <form className="demo-form" onSubmit={handleDemoSubmit}>
            <input type="text" placeholder="Your business name" value={demoName} onChange={e => setDemoName(e.target.value)} required />
            <input type="tel" placeholder="WhatsApp number e.g. +27821234567" value={demoPhone} onChange={e => setDemoPhone(e.target.value)} required />
            <button className="demo-btn" type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Book Demo'}</button>
          </form>
        )}
        {demoError && <p style={{ color: '#ef4444', marginTop: '0.75rem', fontSize: '0.85rem' }}>{demoError}</p>}
      </motion.div>
    </div>
  );
}
