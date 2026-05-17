import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Check, X, Zap, TrendingUp, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import ContactModal from '../components/ContactModal';

const PLANS = [
  {
    id: 'starter',
    name: 'Ignite',
    tagline: 'Perfect for emerging brands',
    monthlyZAR: 3200,
    annualZAR: 2500,
    icon: Zap,
    color: '#A855F7',
    features: [
      { text: '12 posts/month across 3 platforms', included: true },
      { text: 'AI-generated 30-day content calendar', included: true },
      { text: 'Instagram, Facebook, TikTok', included: true },
      { text: 'Brand safety AI review on every post', included: true },
      { text: 'Client approval workflow', included: true },
      { text: 'Monthly performance summary', included: true },
      { text: 'WhatsApp business alerts', included: false },
      { text: 'Dedicated account manager', included: false },
      { text: 'Competitor price tracking', included: false },
      { text: 'Custom reporting', included: false },
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    id: 'growth',
    name: 'Momentum',
    tagline: 'The SA SMB sweet spot',
    monthlyZAR: 5500,
    annualZAR: 4500,
    icon: TrendingUp,
    color: '#9333EA',
    features: [
      { text: '30 posts/month across 5 platforms', included: true },
      { text: 'AI-generated 30-day content calendar', included: true },
      { text: 'Instagram, Facebook, TikTok, LinkedIn + 1 more', included: true },
      { text: 'Brand safety AI review on every post', included: true },
      { text: 'Client approval workflow + revision loop', included: true },
      { text: 'Weekly performance report', included: true },
      { text: 'WhatsApp business alerts', included: true },
      { text: 'Priority support (< 4hr response)', included: true },
      { text: 'Competitor price tracking', included: false },
      { text: 'Dedicated account manager', included: false },
    ],
    cta: 'Start Growing',
    popular: true,
  },
  {
    id: 'scale',
    name: 'Apex',
    tagline: 'Full-service, fully automated',
    monthlyZAR: 11000,
    annualZAR: 9000,
    icon: Crown,
    color: '#7C3AED',
    features: [
      { text: '60 posts/month across all platforms', included: true },
      { text: 'AI-generated 30-day content calendar', included: true },
      { text: 'All platforms including LinkedIn + X', included: true },
      { text: 'Brand safety AI review on every post', included: true },
      { text: 'Client approval workflow + revision loop', included: true },
      { text: 'Weekly + monthly custom reporting', included: true },
      { text: 'WhatsApp business alerts', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Competitor price tracking', included: true },
      { text: 'Xero invoice automation', included: true },
    ],
    cta: 'Scale Up',
    popular: false,
  },
];

const ADDONS = [
  {
    name: 'Lead Stream',
    price: 'R299/month',
    description: '5 AI-qualified leads delivered to your WhatsApp every Monday. No dashboard to check. Just leads — niche-targeted, scored, and ready to contact.',
  },
  {
    name: 'Content Ideator Report',
    price: 'R99/report',
    description: 'One-time AI-generated marketing strategy — market analysis, viral trends, 5 content concepts, and 3 ready-to-post captions. No subscription needed.',
  },
  {
    name: 'Price Intelligence Report',
    price: 'R149/report',
    description: 'Full competitive pricing analysis for your industry — benchmark your rates against competitors and get AI recommendations for optimal pricing.',
  },
  {
    name: 'Onboarding Setup',
    price: 'R1,500 once-off',
    description: 'We set up your brand profile, Google Drive workspace, approval workflow, and run your first content calendar from scratch.',
  },
  {
    name: 'Website Design & Build',
    price: 'From R8,500',
    description: 'Custom-designed, mobile-first website built around your brand — landing pages to full multi-page sites. Includes SEO structure, contact forms, lead capture, and hosting setup. Quoted per project.',
  },
];

const FAQ = [
  {
    q: 'How does the AI content calendar work?',
    a: 'You submit a brief describing your business, campaign goal, target audience, and preferred platforms. Our AI (Google Gemini) generates a full 30-day content calendar — one post per day — with captions, hashtags, and visual briefs. A brand safety reviewer then scores every post before you see it. You approve the calendar in one click, and we schedule everything automatically.',
  },
  {
    q: 'Can I request changes to the calendar?',
    a: 'Yes — and as many times as you need (up to 3 revision cycles per calendar). When you request a revision, you can leave feedback on specific posts. Our AI re-generates only the posts you flagged using your feedback as guidance, then sends the updated calendar back to you for approval.',
  },
  {
    q: 'What platforms do you post to?',
    a: 'We support Instagram (images, Reels, Stories), Facebook (posts, videos), TikTok (scripts and posting), LinkedIn (articles and posts), and X/Twitter. Each post is formatted to that platform\'s best practices — aspect ratios, hashtag counts, caption length, and optimal posting times differ across platforms and we handle all of it.',
  },
  {
    q: 'Are there contracts or lock-in?',
    a: 'Monthly billing is month-to-month — no contracts, cancel anytime with 30 days notice. Annual billing gets you 2 months free (17% saving) and is paid upfront. We also offer a once-off onboarding fee of R1,500 for Ignite clients, R0 for Momentum and Apex.',
  },
  {
    q: 'How is Drift Studio different from just using Hootsuite or Buffer?',
    a: 'Hootsuite and Buffer are scheduling tools — you still create all your content yourself. Drift Studio is a fully managed service: we generate the content, review it for brand safety, send it to you for approval, and publish it for you. Our AI does in hours what would take a content team a week. You stay in control through the approval workflow without doing the heavy lifting.',
  },
  {
    q: 'How does billing work?',
    a: 'Monthly plans are billed in advance via EFT for now. Annual plans are invoiced upfront through Xero and our accounting is fully automated — you receive a proper tax invoice for each payment.',
  },
  {
    q: 'Do you build websites?',
    a: 'Yes — website design and development is available as a standalone service starting from R8,500. We build custom, mobile-first sites tailored to your brand: landing pages, multi-page business sites, portfolio sites, and lead generation pages. Every build includes SEO-optimised structure, contact forms, and hosting setup. Reach out via the contact form for a project quote.',
  },
];

const FAQItem = ({ faq }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', cursor: 'pointer', userSelect: 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <p style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>{faq.q}</p>
        {open ? <ChevronUp size={18} color="#A855F7" /> : <ChevronDown size={18} color="rgba(255,255,255,0.4)" />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: '0.75rem' }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            style={{ color: 'var(--text-muted)', lineHeight: 1.7, overflow: 'hidden', margin: '0.75rem 0 0' }}
          >
            {faq.a}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const getPrice = (plan) => {
    const amount = annual ? plan.annualZAR : plan.monthlyZAR;
    return `R${amount.toLocaleString()}`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-container">
      <div className="container" style={{ paddingTop: 'clamp(5rem, 10vw, 8rem)', paddingBottom: '6rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ marginBottom: '1rem' }}>Transparent <span className="gradient-text">Pricing</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
            AI-powered marketing, fully managed. Priced for South African businesses — no hidden fees, no lock-in.
          </p>

          {/* Billing toggle */}
          <div className="billing-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '99px', padding: '0.4rem 0.4rem 0.4rem 1.2rem' }}>
            <span style={{ fontSize: '0.9rem', color: !annual ? '#fff' : 'var(--text-muted)' }}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              style={{
                width: '48px', height: '26px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                background: annual ? '#9333EA' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 0.3s',
              }}
            >
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px', left: annual ? '25px' : '3px',
                transition: 'left 0.3s',
              }} />
            </button>
            <span style={{ fontSize: '0.9rem', color: annual ? '#fff' : 'var(--text-muted)' }}>
              Annual
            </span>
            <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.75rem', borderRadius: '99px' }}>
              2 months FREE
            </span>
          </div>
        </div>

        {/* Plans grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '5rem' }}>
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.id}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  padding: '2rem',
                  background: plan.popular ? `linear-gradient(135deg, rgba(147,51,234,0.12), rgba(168,85,247,0.06))` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${plan.popular ? plan.color : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '16px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {plan.popular && (
                  <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 1.25rem', borderRadius: '99px', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `rgba(${plan.id === 'starter' ? '168,85,247' : plan.id === 'growth' ? '147,51,234' : '124,58,237'},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color={plan.color} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{plan.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{plan.tagline}</p>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{getPrice(plan)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/month</span>
                  {annual && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#10B981' }}>Billed annually · saves R{((plan.monthlyZAR - plan.annualZAR) * 12).toLocaleString()}/year</p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2rem', flex: 1 }}>
                  {plan.features.map((f, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      {f.included
                        ? <Check size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                        : <X size={16} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0, marginTop: '2px' }} />}
                      <span style={{ fontSize: '0.9rem', color: f.included ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{f.text}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setIsContactOpen(true)}
                  className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                  style={{ width: '100%', padding: '0.9rem' }}
                >
                  {plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Enterprise Banner */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          style={{ padding: '2rem 2.5rem', background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(147,51,234,0.05))', border: '1px solid rgba(147,51,234,0.3)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '5rem' }}
        >
          <div>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem' }}>Enterprise <span className="gradient-text">— from R18,000/month</span></h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px' }}>
              Dedicated strategy team, multi-brand management, custom AI workflows, white-label reporting, SLA-backed support, and Xero-integrated billing. Built for agencies and multi-location businesses.
            </p>
          </div>
          <button onClick={() => setIsContactOpen(true)} className="btn btn-outline" style={{ whiteSpace: 'nowrap', padding: '0.85rem 2rem' }}>
            Talk to Sales
          </button>
        </motion.div>

        {/* Add-ons */}
        <div style={{ marginBottom: '5rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>One-off <span className="gradient-text">Add-ons</span></h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>No subscription needed — buy what you need, when you need it.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {ADDONS.map((addon, i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{addon.name}</h4>
                  <span style={{ color: '#A855F7', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>{addon.price}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>{addon.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Feature comparison note */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="glass-panel"
          style={{ padding: '2rem 2.5rem', marginBottom: '5rem', background: 'rgba(255,255,255,0.02)' }}
        >
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Everything included in every plan</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {[
              'AI brand safety review on every post',
              'Client approval portal access',
              'Google Drive workspace folder',
              'EFT billing',
              'Xero-integrated invoicing',
              'No contracts — cancel anytime',
              'WhatsApp onboarding support',
              '30-day content calendar per brief',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Check size={15} color="#10B981" />
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ */}
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: '2.5rem' }}>Frequently Asked <span className="gradient-text">Questions</span></h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '760px', margin: '0 auto' }}>
            {FAQ.map((faq, i) => <FAQItem key={i} faq={faq} />)}
          </div>
        </div>

      </div>
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </motion.div>
  );
}
