import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';

export default function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    // Replace this URL with the Test or Production Webhook URL from n8n 
    const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook-test/freeflow-lead';

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          setStatus('idle');
          onClose();
          setFormData({ name: '', email: '', phone: '', message: '' });
        }, 3000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Webhook Error:', error);
      setStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)' }} 
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-panel"
            style={{ position: 'relative', width: '100%', maxWidth: '500px', padding: '2.5rem', margin: '1rem', background: 'var(--bg-color)', border: '1px solid rgba(147, 51, 234, 0.3)' }}
          >
            <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <X color="var(--text-muted)" />
            </button>

            <h2 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>Start your <span className="gradient-text">Growth Engine</span></h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Fill out the form below to trigger our automation sequence and get a prompt response.</p>

            {status === 'success' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '2rem', textAlign: 'center', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: '12px' }}>
                <h3 style={{ color: '#22c55e', marginBottom: '0.5rem' }}>Transmission Successful!</h3>
                <p style={{ color: 'var(--text-muted)' }}>Our n8n automation pipeline has received your data.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Full Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Email</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Phone</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>How can we scale your business?</label>
                  <textarea required rows="4" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none', resize: 'vertical' }} />
                </div>

                {status === 'error' && (
                  <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>Error connecting to n8n webhook. Please make sure n8n is running and the test webhook is active.</p>
                )}

                <button type="submit" disabled={status === 'submitting'} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                  {status === 'submitting' ? 'Firing Webhook...' : (
                    <>Initialize Sequence <Send size={18} /></>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
