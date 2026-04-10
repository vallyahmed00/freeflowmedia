import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { leadApi } from '../services/leadApi';
import toast from 'react-hot-toast';
import './LeadFormModal.css';

const LeadFormModal = ({ isOpen, onClose, onSaved, editLead = null }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    location: '',
    country: 'South Africa',
    description: '',
    source: 'manual',
  });

  useEffect(() => {
    if (editLead) {
      setFormData({
        business_name: editLead.business_name || '',
        contact_name: editLead.contact_name || '',
        email: editLead.email || '',
        phone: editLead.phone || '',
        website: editLead.website || '',
        industry: editLead.industry || '',
        location: editLead.location || '',
        country: editLead.country || 'South Africa',
        description: editLead.description || '',
        source: editLead.source || 'manual',
      });
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
        description: '',
        source: 'manual',
      });
    }
  }, [editLead, isOpen]);

  const handleSubmit = async () => {
    if (!formData.business_name) {
      toast.error('Business name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editLead) {
        await leadApi.updateLead(editLead.id, formData);
        toast.success('Lead updated successfully');
      } else {
        await leadApi.createLead(formData);
        toast.success('Lead added successfully');
      }
      onSaved && onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save lead');
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

          <div className="form-row">
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
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+27..."
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
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, Address"
              />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
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
