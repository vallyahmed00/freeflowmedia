import React from 'react';
import { Mail, Phone, Globe, MapPin, X, Edit, Trash2 } from 'lucide-react';
import './LeadDetailModal.css';
import './Modal.css';

const statusColors = {
  new: '#10B981',
  contacted: '#3B82F6',
  interested: '#8B5CF6',
  not_interested: '#EF4444',
  follow_up: '#F59E0B',
  converted: '#22C55E',
};

const LeadDetailModal = ({ lead, isOpen, onClose, onEdit, onDelete }) => {
  if (!isOpen || !lead) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h2>{lead.business_name}</h2>
            <span 
              className="lead-status-badge"
              style={{ backgroundColor: statusColors[lead.status] || statusColors.new }}
            >
              {lead.status?.replace('_', ' ')}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {lead.industry && (
            <p className="lead-industry">{lead.industry}</p>
          )}

          <div className="lead-info-grid">
            {lead.contact_name && (
              <div className="lead-info-item">
                <span className="label">Contact</span>
                <span className="value">{lead.contact_name}</span>
              </div>
            )}
            {lead.email && (
              <div className="lead-info-item">
                <span className="label">Email</span>
                <a href={`mailto:${lead.email}`} className="value link">
                  <Mail size={14} />
                  {lead.email}
                </a>
              </div>
            )}
            {lead.phone && (
              <div className="lead-info-item">
                <span className="label">Phone</span>
                <a href={`tel:${lead.phone}`} className="value link">
                  <Phone size={14} />
                  {lead.phone}
                </a>
              </div>
            )}
            {lead.website && (
              <div className="lead-info-item">
                <span className="label">Website</span>
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="value link">
                  <Globe size={14} />
                  {lead.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {lead.location && (
              <div className="lead-info-item">
                <span className="label">Location</span>
                <span className="value">
                  <MapPin size={14} />
                  {lead.location}
                </span>
              </div>
            )}
            {lead.country && (
              <div className="lead-info-item">
                <span className="label">Country</span>
                <span className="value">{lead.country}</span>
              </div>
            )}
            {lead.priority_score > 0 && (
              <div className="lead-info-item">
                <span className="label">Priority Score</span>
                <span className="value priority">{Math.round(lead.priority_score * 100)}%</span>
              </div>
            )}
          </div>

          {lead.description && (
            <div className="lead-description">
              <span className="label">Description</span>
              <p>{lead.description}</p>
            </div>
          )}

          {lead.notes && (
            <div className="lead-notes">
              <span className="label">Notes</span>
              <p>{lead.notes}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger" onClick={() => onDelete && onDelete(lead.id)}>
            <Trash2 size={16} />
            Delete
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={() => onEdit && onEdit(lead)}>
            <Edit size={16} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailModal;
