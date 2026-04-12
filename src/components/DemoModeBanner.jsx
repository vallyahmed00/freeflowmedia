import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, TrendingUp, Users, Target, BarChart3, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const demoStats = [
  { icon: TrendingUp, value: '250+', label: 'Campaigns Launched', color: '#9333EA' },
  { icon: Users, value: '98%', label: 'Client Retention Rate', color: '#A855F7' },
  { icon: Target, value: '3.5x', label: 'Average ROI', color: '#C084FC' },
  { icon: BarChart3, value: '10M+', label: 'Leads Generated', color: '#9333EA' }
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
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1001,
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(24, 24, 27, 0.95))',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(147, 51, 234, 0.3)',
          padding: isExpanded ? '1.5rem' : '0.75rem 1.5rem'
        }}
      >
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          position: 'relative'
        }}>
          {/* Close button */}
          <button
            onClick={() => setIsDismissed(true)}
            style={{
              position: 'absolute',
              top: isExpanded ? '1rem' : '0.5rem',
              right: isExpanded ? '1rem' : '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
            aria-label="Dismiss demo banner"
          >
            <X size={18} />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Play size={18} color="white" fill="white" />
                </div>
                <div>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                    🔥 Experience Our Platform in Demo Mode
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Try our AI-powered tools with sample data - no signup required
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                <button
                  onClick={() => setIsExpanded(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
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
                    background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Try Demo <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Expanded view */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ paddingTop: '2.5rem', paddingRight: '3rem' }}
              >
                <h3 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '1rem', marginTop: 0 }}>
                  Explore Our Platform Risk-Free
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                  Our demo mode gives you full access to explore our AI-powered marketing tools with realistic sample data. 
                  See exactly what our clients experience - no commitment required.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  {demoStats.map((stat, index) => (
                    <div key={index} style={{
                      padding: '1.25rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <stat.icon size={28} color={stat.color} style={{ marginBottom: '0.75rem' }} />
                      <h4 style={{ fontSize: '2rem', marginBottom: '0.25rem', background: `linear-gradient(135deg, ${stat.color}, var(--accent-color))`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {stat.value}
                      </h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '1rem' }}>Demo Features Available:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    {demoFeatures.map((feature, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Check size={18} color="#9333EA" />
                        <span style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      localStorage.setItem('demo-mode', 'true');
                      navigate('/leads');
                    }}
                    style={{
                      padding: '0.75rem 2rem',
                      background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Launch Lead Generator Demo <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('demo-mode', 'true');
                      navigate('/marketing-generator');
                    }}
                    style={{
                      padding: '0.75rem 2rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(147, 51, 234, 0.5)',
                      borderRadius: '10px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(147, 51, 234, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  >
                    Try Content Ideator
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    style={{
                      padding: '0.75rem 2rem',
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    Collapse
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
