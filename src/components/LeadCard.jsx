import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Globe, MapPin, Star, MessageCircle, ArrowRight } from 'lucide-react';
import ScoreRing from './ScoreRing';
import './LeadCard.css';

const statusColors = {
  new: '#10B981',
  contacted: '#3B82F6',
  interested: '#8B5CF6',
  not_interested: '#EF4444',
  follow_up: '#F59E0B',
  converted: '#22C55E',
};

const TEMP_BADGE = {
  hot:  { emoji: '🔴', label: 'Hot',  bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  warm: { emoji: '🟡', label: 'Warm', bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  cold: { emoji: '🔵', label: 'Cold', bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
};

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
  aiMode = false,
  index = 0,
  onUseLead,
  onSendAlert,
  onSelect,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
}) => {
  // ── AI Lead Hunter mode ──────────────────────────────────────────────────
  if (aiMode) {
    const temp = TEMP_BADGE[lead.temperature] || TEMP_BADGE.cold;
    const whatsappText = encodeURIComponent(
      `Hi ${lead.name},\n\nI came across ${lead.company} and noticed you might be dealing with ${lead.painPoint}.\n\nI'd love to share how Drift Studio has helped similar businesses.\n\nWorth a quick chat?`
    );

    return (
      <motion.div
        className="ai-lead-card glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
      >
        <div className="ai-lead-header">
          <div className="ai-lead-identity">
            <div className="ai-lead-name">{lead.name}</div>
            <div className="ai-lead-role">{lead.role} @ {lead.company}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="temp-badge" style={{ background: temp.bg, color: temp.color }}>
              {temp.emoji} {temp.label}
            </span>
            <ScoreRing score={lead.score} />
          </div>
        </div>

        <div className="ai-lead-body">
          <p className="ai-lead-pain">💢 {lead.painPoint}</p>
          <p className="ai-lead-signal">📡 {lead.signal}</p>
          <div className="ai-lead-meta">
            <span>💰 {lead.estimatedBudget}</span>
            <span>🕐 {lead.bestContactTime}</span>
          </div>
        </div>

        <div className="ai-lead-actions">
          <button
            className="ai-action-btn"
            title="Post to Discord"
            onClick={() => onSendAlert?.({ type: 'single', lead, channels: ['discord'] })}
          >
            💬 Discord
          </button>
          <button
            className="ai-action-btn"
            title="Send to Telegram"
            onClick={() => onSendAlert?.({ type: 'single', lead, channels: ['telegram'] })}
          >
            ✈️ Telegram
          </button>
          <a
            className="ai-action-btn"
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            📱 WhatsApp
          </a>
          <button
            className="ai-action-use"
            onClick={() => onUseLead?.(lead)}
          >
            Use lead <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    );
  }

  // ── CRM mode (original behaviour, unchanged) ─────────────────────────────
  const age = getLeadAge(lead.createdAt || lead.created_at);
  const wa = lead.phone ? `https://wa.me/${stripNonDigits(lead.phone)}` : null;

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onToggleSelect && onToggleSelect(lead.id);
  };

  const handleContactClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`lead-card glass-panel${isSelected ? ' lead-card--selected' : ''}`}
      onClick={() => onSelect && onSelect(lead)}
    >
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

        <div className="lead-card-actions" onClick={handleContactClick}>
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="lead-quick-btn" title={`Email ${lead.email}`}>
              <Mail size={14} />
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="lead-quick-btn" title={`Call ${lead.phone}`}>
              <Phone size={14} />
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="lead-quick-btn lead-quick-btn--wa" title={`WhatsApp ${lead.phone}`}>
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
          <div className="lead-card-detail"><MapPin size={14} /><span>{lead.location}</span></div>
        )}
        {lead.email && (
          <div className="lead-card-detail"><Mail size={14} /><span>{lead.email}</span></div>
        )}
        {lead.phone && (
          <div className="lead-card-detail"><Phone size={14} /><span>{lead.phone}</span></div>
        )}
        {lead.website && (
          <div className="lead-card-detail"><Globe size={14} /><span>{lead.website.replace(/^https?:\/\//, '')}</span></div>
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
