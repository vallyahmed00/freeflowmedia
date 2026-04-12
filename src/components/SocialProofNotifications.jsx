import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, X } from 'lucide-react';
import { getAllSocialProofNotifications } from '../services/contentService';

export default function SocialProofNotifications() {
  const [currentNotification, setCurrentNotification] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await getAllSocialProofNotifications(true);
        setNotifications(data);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };
    loadNotifications();
  }, []);

  useEffect(() => {
    if (notifications.length === 0 || isDismissed) return;

    // Show first notification after 5 seconds
    const initialTimeout = setTimeout(() => {
      setCurrentNotification(notifications[0]);
    }, 5000);

    return () => clearTimeout(initialTimeout);
  }, [notifications, isDismissed]);

  useEffect(() => {
    if (currentNotification === null || isDismissed || notifications.length === 0) return;

    const currentIndex = notifications.findIndex(n => n.id === currentNotification.id);
    const nextIndex = (currentIndex + 1) % notifications.length;

    // Schedule next notification
    const timeout = setTimeout(() => {
      if (!isDismissed) {
        setCurrentNotification(notifications[nextIndex]);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [currentNotification, isDismissed, notifications]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => {
      setIsDismissed(false);
      setCurrentNotification(null);
    }, 30000); // Show again after 30 seconds
  };

  if (notifications.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      {currentNotification && !isDismissed && (
        <motion.div
          key={currentNotification.id}
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '2rem',
            maxWidth: '380px',
            padding: '1rem 1.25rem',
            background: 'rgba(18, 18, 27, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            border: '1px solid rgba(147, 51, 234, 0.3)',
            boxShadow: '0 8px 32px rgba(147, 51, 234, 0.2)',
            zIndex: 998,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={20} color="white" />
          </div>
          <p style={{
            color: 'var(--text-main)',
            fontSize: '0.9rem',
            fontWeight: 500,
            lineHeight: 1.4,
            flex: 1
          }}>
            {currentNotification.text}
          </p>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
