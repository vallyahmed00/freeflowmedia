import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAllTrustBadges } from '../services/contentService';

export default function TrustBadges() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBadges = async () => {
      try {
        const badgesData = await getAllTrustBadges(true);
        setBadges(badgesData);
      } catch (error) {
        console.error('Error loading trust badges:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBadges();
  }, []);

  if (loading || badges.length === 0) {
    return null; // Don't show section if no badges
  }

  return (
    <section style={{ 
      padding: '3rem 0', 
      borderTop: '1px solid rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)'
    }}>
      <div className="container">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '2.5rem' }}
        >
          <p style={{ 
            color: 'var(--text-muted)', 
            fontSize: '0.9rem', 
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: 0
          }}>
            Trusted by Forward-Thinking Brands
          </p>
        </motion.div>

        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '3rem',
          flexWrap: 'wrap'
        }}>
          {badges.map((badge, index) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.05 }}
              style={{
                padding: '1rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                cursor: 'default',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(147, 51, 234, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              {badge.logoUrl ? (
                <img 
                  src={badge.logoUrl} 
                  alt={badge.companyName}
                  style={{ 
                    width: '100%', 
                    height: '60px', 
                    objectFit: 'contain',
                    marginBottom: '0.5rem',
                    borderRadius: '8px'
                  }}
                />
              ) : (
                <h4 style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 700,
                  marginBottom: '0.25rem',
                  background: 'linear-gradient(135deg, var(--text-main), var(--text-muted))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {badge.companyName}
                </h4>
              )}
              {!badge.logoUrl && (
                <p style={{ 
                  color: 'var(--text-muted)', 
                  fontSize: '0.75rem',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {badge.industry || 'Client'}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
