import React from 'react';
import { Mail, Phone, Globe, MapPin, Star, MessageCircle } from 'lucide-react';
import './LeadCard.css';

const statusColors = {
  new: '#10B981',
  contacted: '#3B82F6',
  interested: '#8B5CF6',
  not_interested: '#EF4444',
  follow_up: '#F59E0B',
  converted: '#22C55E',
};

/**
 * Format a Firestore Timestamp or JS Date as "X days ago / today / yesterday".
 */
const getLeadAge = (createdAt) => {
  if (!createdAt) return null;
  const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
  if (isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

const stripNonDigits = (phone) => (phone || '').replace(/\D/g, '');

const LeadCard = ({
  lead,
  onSelect,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
}) => {
  const age = getLeadAge(lead.createdAt || lead.created_at);
  const wa = lead.phone ? `https://wa.me/${stripNonDigits(lead.phone)}` : null;

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onToggleSelect && onToggleSelect(lead.id);
  };

  const handleContactClick = (e) => {
    // Prevent the card click from also firing
    e.stopPropagation();
  };

  return (
    <div
      className={`lead-card glass-panel${isSelected ? ' lead-card--selected' : ''}`}
      onClick={() => onSelect && onSelect(lead)}
    >
      {/* Checkbox — shown on hover or when already selected */}
      <label
        className="lead-card-checkbox"
        onClick={(e) => e.stopPropagation()}
        title="Select lead"
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
        />
        <span className="lead-card-checkbox-mark" />
      </label>

      <div className="lead-card-header">
        <div className="lead-card-title">
          <h3>{lead.business_name}</h3>
          <span
            className="lead-status-badge"
            style={{ backgroundColor: statusColors[lead.status] || statusColors.new }}
          >
            {lead.status?.replace(/_/g, ' ')}
          </span>
        </div>

        {/* One-click contact buttons */}
        <div className="lead-card-actions" onClick={handleContactClick}>
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="lead-quick-btn"
              title={`Email ${lead.email}`}
            >
              <Mail size={14} />
            </a>
          )}
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="lead-quick-btn"
              title={`Call ${lead.phone}`}
            >
              <Phone size={14} />
            </a>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="lead-quick-btn lead-quick-btn--wa"
              title={`WhatsApp ${lead.phone}`}
            >
              <MessageCircle size={14} />
            </a>
          )}
        </div>
      </div>

      <div className="lead-card-industry">
        {lead.industry || 'Industry not specified'}
      </div>

      <div className="lead-card-details">
        {lead.location && (
          <div className="lead-card-detail">
            <MapPin size={14} />
            <span>{lead.location}</span>
          </div>
        )}
        {lead.email && (
          <div className="lead-card-detail">
            <Mail size={14} />
            <span>{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="lead-card-detail">
            <Phone size={14} />
            <span>{lead.phone}</span>
          </div>
        )}
        {lead.website && (
          <div className="lead-card-detail">
            <Globe size={14} />
            <span>{lead.website.replace(/^https?:\/\//, '')}</span>
          </div>
        )}
      </div>

      {lead.priority_score > 0 && (
        <div className="lead-card-priority">
          <Star size={14} className="star-icon" />
          <span>Priority Score: {Math.round(lead.priority_score * 100)}%</span>
        </div>
      )}

      <div className="lead-card-footer">
        <span className="lead-source">{lead.source}</span>
        {age && <span className="lead-age">{age}</span>}
      </div>
    </div>
  );
};

export default LeadCard;
