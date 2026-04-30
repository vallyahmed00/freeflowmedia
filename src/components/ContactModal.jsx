import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Upload, Link2 } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { addLead } from '../services/contentService';
import { runNewLeadAutomation } from '../services/automationServices';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export default function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    marketingMaterialsLink: '',
    marketingMaterialsFiles: []
  });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFilesToStorage = async (files) => {
    const uploadPromises = files.map(async (file) => {
      const fileRef = ref(storage, `contact-form-uploads/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      return await getDownloadURL(snapshot.ref);
    });
    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setUploadProgress(0);

    try {
      // Step 1: Upload files to Firebase Storage (if any)
      let fileUrls = [];
      if (formData.marketingMaterialsFiles.length > 0) {
        setUploadProgress(20);
        try {
          fileUrls = await uploadFilesToStorage(formData.marketingMaterialsFiles);
          setUploadProgress(50);
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          // Continue without files if upload fails
        }
      }

      // Step 2: Save lead to Firebase Firestore (PRIMARY)
      setUploadProgress(60);
      const leadData = {
        business_name: formData.name,
        industry: '',
        location: '',
        status: 'new',
        email: formData.email,
        phone: formData.phone,
        website: '',
        notes: formData.message,
        marketingMaterialsLink: formData.marketingMaterialsLink,
        marketingMaterialsFiles: fileUrls,
        source: 'contact_form',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addLead(leadData);
      setUploadProgress(90);

      // Step 4: Trigger complete automation sequence with multi-platform notifications
      // Platforms: slack, discord, teams, telegram, email
      runNewLeadAutomation(leadData, ['discord', 'telegram', 'email']).catch(err => {
        console.log('Automation sequence failed (non-critical):', err);
      });

      setUploadProgress(100);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setUploadProgress(0);
        onClose();
        setFormData({ 
          name: '', 
          email: '', 
          phone: '', 
          message: '',
          marketingMaterialsLink: '',
          marketingMaterialsFiles: []
        });
      }, 3000);
    } catch (error) {
      console.error('Error saving lead:', error);

      // Fallback to EmailJS if Firebase fails
      try {
        const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'your_service_id';
        const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'your_template_id';
        const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'your_public_key';

        if (EMAILJS_SERVICE_ID !== 'your_service_id') {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              from_name: formData.name,
              from_email: formData.email,
              phone: formData.phone,
              message: formData.message
            },
            EMAILJS_PUBLIC_KEY
          );

          setStatus('success');
          setTimeout(() => {
            setStatus('idle');
            onClose();
            setFormData({ name: '', email: '', phone: '', message: '' });
          }, 3000);
        } else {
          setStatus('error');
        }
      } catch (emailError) {
        console.error('EmailJS fallback failed:', emailError);
        setStatus('error');
      }
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
                <h3 style={{ color: '#22c55e', marginBottom: '0.5rem' }}>✓ Lead Successfully Saved!</h3>
                <p style={{ color: 'var(--text-muted)' }}>Your information has been received. Our team will contact you shortly.</p>
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

                {/* Marketing Materials Section */}
                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <Upload size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Marketing Materials <span style={{ fontSize: '0.8rem' }}>(Optional)</span>
                  </label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    Share existing assets, brand guidelines, or a Google Drive link.
                  </p>
                  
                  <input
                    type="text"
                    placeholder="Google Drive or cloud storage link"
                    value={formData.marketingMaterialsLink}
                    onChange={e => setFormData({...formData, marketingMaterialsLink: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '0.9rem', marginBottom: '0.75rem' }}
                  />
                  
                  <div
                    style={{
                      border: '2px dashed rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => document.getElementById('contactFileInput').click()}
                  >
                    <Upload size={24} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                      Or upload files directly
                    </p>
                    <input
                      id="contactFileInput"
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setFormData(prev => ({ ...prev, marketingMaterialsFiles: [...prev.marketingMaterialsFiles, ...files] }));
                      }}
                    />
                  </div>

                  {formData.marketingMaterialsFiles.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {formData.marketingMaterialsFiles.map((file, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '4px',
                            marginBottom: '0.25rem',
                            fontSize: '0.8rem'
                          }}
                        >
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                marketingMaterialsFiles: prev.marketingMaterialsFiles.filter((_, i) => i !== index)
                              }));
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {status === 'error' && (
                  <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>Failed to save your information. Please try again or contact us directly.</p>
                )}

                <button type="submit" disabled={status === 'submitting'} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                  {status === 'submitting' ? `Saving... ${uploadProgress}%` : (
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
