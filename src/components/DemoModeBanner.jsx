import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, TrendingUp, Users, Target, BarChart3, Check, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const demoStats = [
  { icon: TrendingUp, value: '250+', label: 'Campaigns Launched', color: '#a855f7' },
  { icon: Users, value: '98%', label: 'Client Retention Rate', color: '#c084fc' },
  { icon: Target, value: '3.5x', label: 'Average ROI', color: '#e879f9' },
  { icon: BarChart3, value: '10M+', label: 'Leads Generated', color: '#a855f7' }
];

const demoFeatures = [
  'AI-Powered Content Strategy Generator',
  'Automated Lead Discovery & Scoring',
  'Real-Time Campaign Analytics',
  'Multi-Channel Marketing Automation',
  'Custom ROI Calculators',
  'Competitive Analysis Tools'
];

export default function DemoModeBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1001,
          background: 'rgba(9, 9, 11, 0.85)',
          backdropFilter: 'blur(24px) saturate(150%)',
          WebkitBackdropFilter: 'blur(24px) saturate(150%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(147, 51, 234, 0.1)',
          padding: isExpanded ? '2rem' : '0.875rem 1.5rem'
        }}
      >
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative'
        }}>
          {/* Close button */}
          <button
            onClick={() => setIsDismissed(true)}
            style={{
              position: 'absolute',
              top: isExpanded ? '0' : '50%',
              right: '0',
              transform: isExpanded ? 'none' : 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#a1a1aa',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a1a1aa';
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label="Dismiss demo banner"
          >
            <X size={18} strokeWidth={1.5} />
          </button>

          {/* Compact view */}
          {!isExpanded && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              paddingRight: '3rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(147, 51, 234, 0.1)',
                  border: '1px solid rgba(147, 51, 234, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={16} color="#c084fc" />
                </div>
                <div>
                  <p style={{ color: '#fafafa', fontWeight: 500, fontSize: '0.95rem', margin: 0, letterSpacing: '-0.01em' }}>
                    Experience Drift Studio
                  </p>
                  <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: '0.1rem 0 0 0' }}>
                    Explore our AI-powered tools in a live interactive environment
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                <button
                  onClick={() => setIsExpanded(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#e4e4e7',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#e4e4e7';
                  }}
                >
                  Learn More
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('demo-mode', 'true');
                    navigate('/leads');
                  }}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: '#fafafa',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#09090b',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 10px rgba(255, 255, 255, 0.1)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Enter Demo <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}

          {/* Expanded view */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ paddingRight: '2rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(147, 51, 234, 0.1)',
                    border: '1px solid rgba(147, 51, 234, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Sparkles size={18} color="#c084fc" />
                  </div>
                  <h3 style={{ color: '#fafafa', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
                    Explore Drift Studio Risk-Free
                  </h3>
                </div>
                
                <p style={{ color: '#a1a1aa', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '800px' }}>
                  Our demo mode provides full access to our proprietary AI marketing tools with populated sample data. 
                  Experience the exact workflows our enterprise clients use daily—without creating an account.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                  {demoStats.map((stat, index) => (
                    <div key={index} style={{
                      padding: '1.5rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                    >
                      <stat.icon size={22} color={stat.color} style={{ marginBottom: '1rem', opacity: 0.9 }} />
                      <h4 style={{ fontSize: '1.875rem', fontWeight: 600, marginBottom: '0.25rem', color: '#fafafa', letterSpacing: '-0.02em' }}>
                        {stat.value}
                      </h4>
                      <p style={{ color: '#a1a1aa', fontSize: '0.875rem', margin: 0 }}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                  <h4 style={{ color: '#e4e4e7', fontSize: '1.05rem', fontWeight: 500, marginBottom: '1.25rem' }}>Core Capabilities:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    {demoFeatures.map((feature, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                          width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(147, 51, 234, 0.1)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                          <Check size={12} color="#c084fc" strokeWidth={3} />
                        </div>
                        <span style={{ color: '#d4d4d8', fontSize: '0.95rem' }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      localStorage.setItem('demo-mode', 'true');
                      navigate('/leads');
                    }}
                    style={{
                      padding: '0.75rem 1.75rem',
                      background: '#fafafa',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#09090b',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Launch Demo Environment <ArrowRight size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('demo-mode', 'true');
                      navigate('/marketing-generator');
                    }}
                    style={{
                      padding: '0.75rem 1.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fafafa',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    Try Content Ideator
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#a1a1aa',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      marginLeft: 'auto'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fafafa'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#a1a1aa'}
                  >
                    Collapse details
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
