import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Check, Repeat } from 'lucide-react';
import ContactModal from '../components/ContactModal';
import { useCurrency } from '../context/CurrencyContext';

const packages = [
  {
    id: 'starter',
    name: 'Ignite',
    priceUSD: 1500,
    priceZAR: 25000,
    subtitle: 'Perfect for emerging brands',
    features: ['Local SEO Optimization', 'Social Media Management (2 Platforms)', 'Monthly Analytics Report', 'Basic Content Creation'],
    gradient: 'linear-gradient(135deg, #18181B, #27272A)'
  },
  {
    id: 'growth',
    name: 'Momentum',
    priceUSD: 3500,
    priceZAR: 60000,
    subtitle: 'The standard for scaling',
    features: ['Comprehensive National SEO', 'PPC Ad Management (Up to $10k spend)', 'Advanced Content Marketing', 'Weekly Strategy Calls', 'Custom Graphics'],
    gradient: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(168, 85, 247, 0.2))',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Apex',
    priceUSD: 7000,
    priceZAR: 120000,
    subtitle: 'Dominance requires power',
    features: ['Full-Suite Omni-Channel Marketing', 'Dedicated Strategy Team', 'Advanced Conversion Tracking', 'Custom Video Production', 'Priority 24/7 Support'],
    gradient: 'linear-gradient(135deg, #18181B, #27272A)'
  }
];

export default function Pricing() {
  const [activeTab, setActiveTab] = useState(packages[1].id);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const { currency, toggleCurrency, getSymbol } = useCurrency();

  const getPrice = (pkg) => {
    const amount = currency === 'USD' ? pkg.priceUSD : pkg.priceZAR;
    return `${getSymbol()}${amount.toLocaleString()}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-container"
    >
      <div className="container" style={{ paddingTop: '8rem', paddingBottom: '4rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1rem' }}>Transparent <span className="gradient-text">Pricing</span></h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1.2rem' }}>Invest in growth, not just agency retainers.</p>

        {/* Currency Toggle */}
        <button
          onClick={toggleCurrency}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '99px',
            padding: '0.5rem 1.5rem',
            color: 'white',
            cursor: 'pointer',
            marginBottom: '2rem',
            fontSize: '0.9rem'
          }}
        >
          <Repeat size={16} />
          Switch to {currency === 'ZAR' ? 'USD ($)' : 'ZAR (R)'}
        </button>

        {/* Animated Tabs */}
        <div className="tabs-container" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setActiveTab(pkg.id)}
              style={{
                background: activeTab === pkg.id ? 'var(--primary-color)' : 'transparent',
                border: `1px solid ${activeTab === pkg.id ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: '99px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
            >
              {activeTab === pkg.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--primary-color)',
                    borderRadius: '99px',
                    zIndex: -1
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{pkg.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        <AnimatePresence mode="wait">
          {packages.map((pkg) => (
            pkg.id === activeTab && (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="glass-panel"
                style={{
                  maxWidth: '500px',
                  margin: '0 auto',
                  padding: '3rem',
                  background: pkg.gradient,
                  border: pkg.popular ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'left'
                }}
              >
                {pkg.popular && (
                  <div style={{ background: 'var(--primary-color)', color: 'white', padding: '0.25rem 1rem', borderRadius: '99px', display: 'inline-block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    MOST POPULAR
                  </div>
                )}
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', lineHeight: 1.2 }}>{getPrice(pkg)}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/mo</span></h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{pkg.subtitle}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                  {pkg.features.map((feature, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Check size={20} color="var(--accent-color)" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => setIsContactOpen(true)} className={`btn ${pkg.popular ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', padding: '1rem' }}>
                  Choose {pkg.name}
                </button>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </motion.div>
  );
}
