import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { leadApi } from '../services/leadApi';
import toast from 'react-hot-toast';
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, COUNTRIES, SA_PROVINCES, COUNTRY_TO_DIAL } from '../utils/countryCodes';

const SEL = {
  padding: '0.65rem 0.75rem', background: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
  color: 'white', fontSize: '0.9rem', width: '100%', cursor: 'pointer',
};
import './LeadFormModal.css';

const LeadFormModal = ({ isOpen, onClose, onSaved, editLead = null }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [dialCode, setDialCode] = useState(DEFAULT_COUNTRY_CODE);
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    location: '',
    country: 'South Africa',
    province: '',
    description: '',
    source: 'manual',
    followUpDate: '',
  });

  const handleCountryChange = (country) => {
    setFormData(f => ({ ...f, country, province: '' }));
    const dial = COUNTRY_TO_DIAL[country];
    if (dial) setDialCode(dial);
  };

  useEffect(() => {
    if (editLead) {
      const fud = editLead.followUpDate?.toDate
        ? editLead.followUpDate.toDate().toISOString().split('T')[0]
        : editLead.followUpDate || '';
      setFormData({
        business_name: editLead.business_name || '',
        contact_name: editLead.contact_name || '',
        email: editLead.email || '',
        phone: editLead.phone || '',
        website: editLead.website || '',
        industry: editLead.industry || '',
        location: editLead.location || '',
        country: editLead.country || 'South Africa',
        province: editLead.province || '',
        description: editLead.description || '',
        source: editLead.source || 'manual',
        followUpDate: fud,
      });
      const dial = COUNTRY_TO_DIAL[editLead.country];
      if (dial) setDialCode(dial);
    } else {
      setFormData({
        business_name: '',
        contact_name: '',
        email: '',
        phone: '',
        website: '',
        industry: '',
        location: '',
        country: 'South Africa',
        province: '',
        description: '',
        source: 'manual',
        followUpDate: '',
      });
      setDialCode(DEFAULT_COUNTRY_CODE);
    }
  }, [editLead, isOpen]);

  const handleSubmit = async () => {
    if (!formData.business_name) {
      toast.error('Business name is required');
      return;
    }

    setIsSaving(true);
    const payload = {
      ...formData,
      phone: formData.phone ? `${dialCode} ${formData.phone}` : '',
    };
    try {
      if (editLead) {
        await leadApi.updateLead(editLead.id, payload);
        toast.success('Lead updated successfully');
      } else {
        await leadApi.createLead(payload);
        toast.success('Lead added successfully');
      }
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save lead');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Plus className="plus-icon" />
            <h2>{editLead ? 'Edit Lead' : 'Add New Lead'}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-form">
          <div className="form-group">
            <label>Business Name *</label>
            <input
              type="text"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              placeholder="Enter business name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contact Name</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Primary contact"
              />
            </div>
            <div className="form-group">
              <label>Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Technology"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={dialCode}
                onChange={e => setDialCode(e.target.value)}
                style={{ padding: '0.65rem 0.4rem', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'white', fontSize: '0.82rem', flexShrink: 0, maxWidth: '160px' }}
              >
                {COUNTRY_CODES.map(c => (
                  <option key={`${c.country}-${c.code}`} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="71 234 5678"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Country</label>
              <select value={formData.country} onChange={e => handleCountryChange(e.target.value)} style={SEL}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {formData.country === 'South Africa' && (
              <div className="form-group">
                <label>Province</label>
                <select value={formData.province} onChange={e => setFormData(f => ({ ...f, province: e.target.value }))} style={SEL}>
                  <option value="">Select province</option>
                  {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>City / Address</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Cape Town, 12 Main Road"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Notes about this lead..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Follow-up Date</label>
            <input
              type="date"
              value={formData.followUpDate}
              onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : editLead ? 'Update Lead' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadFormModal;
