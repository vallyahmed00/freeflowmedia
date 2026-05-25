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
          <motion.div key={bot.name} className="bot-card" {...fadeUp(i * 0.07)}>
            <div className="bot-card-icon">{bot.icon}</div>
            <div className="bot-card-badge">{bot.badge}</div>
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
        <h2>All 5 Bots — Full Automation Suite</h2>
        <p>Get every bot running for one flat monthly fee. We handle setup, maintenance, and updates.</p>
        <div className="bundle-price">R2,500 <span>/month</span></div>
        <div className="bundle-saving">Save R400/month vs buying individually</div>
        <a href="#demo" className="btn btn-primary">Get the Full Suite</a>
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
