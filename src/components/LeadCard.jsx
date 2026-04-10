import React from 'react';
import { Mail, Phone, Globe, MapPin, Star, MoreVertical } from 'lucide-react';
import './LeadCard.css';

const statusColors = {
  new: '#10B981',
  contacted: '#3B82F6',
  interested: '#8B5CF6',
  not_interested: '#EF4444',
  follow_up: '#F59E0B',
  converted: '#22C55E',
};

const LeadCard = ({ lead, onSelect }) => {
  return (
    <div className="lead-card glass-panel" onClick={() => onSelect && onSelect(lead)}>
      <div className="lead-card-header">
        <div className="lead-card-title">
          <h3>{lead.business_name}</h3>
          <span 
            className="lead-status-badge"
            style={{ backgroundColor: statusColors[lead.status] || statusColors.new }}
          >
            {lead.status?.replace('_', ' ')}
          </span>
        </div>
        <button className="lead-card-menu">
          <MoreVertical size={16} />
        </button>
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
        {lead.description && (
          <span className="lead-description-preview">
            {lead.description.slice(0, 60)}...
          </span>
        )}
      </div>
    </div>
  );
};

export default LeadCard;
