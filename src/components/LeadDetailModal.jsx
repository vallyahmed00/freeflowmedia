import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  X,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  Copy,
  CheckCheck,
  MessageSquarePlus,
  MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { addInteraction, getInteractions } from '../services/leadApi';
import './LeadDetailModal.css';

const OUTREACH_FN_URL =
  'https://us-central1-freeflow-media.cloudfunctions.net/generateOutreachEmail';

const statusColors = {
  new: '#10B981',
  contacted: '#3B82F6',
  interested: '#8B5CF6',
  not_interested: '#EF4444',
  follow_up: '#F59E0B',
  converted: '#22C55E',
};

const stripNonDigits = (phone) => (phone || '').replace(/\D/g, '');

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LeadDetailModal = ({ lead, isOpen, onClose, onEdit, onDelete }) => {
  // Outreach AI state
  const [draftingEmail, setDraftingEmail] = useState(false);
  const [outreachEmail, setOutreachEmail] = useState('');
  const [copied, setCopied] = useState(false);

  // Interaction notes state
  const [interactions, setInteractions] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  useEffect(() => {
    if (!isOpen || !lead?.id) return;
    setOutreachEmail('');
    setCopied(false);
    setNoteText('');

    // Load existing interactions
    setLoadingInteractions(true);
    getInteractions(lead.id)
      .then(setInteractions)
      .catch((err) => console.error('Failed to load interactions:', err))
      .finally(() => setLoadingInteractions(false));
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  const wa = lead.phone ? `https://wa.me/${stripNonDigits(lead.phone)}` : null;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDraftEmail = async () => {
    setDraftingEmail(true);
    setOutreachEmail('');
    try {
      const res = await fetch(OUTREACH_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: lead.business_name,
          industry: lead.industry,
          location: lead.location,
          description: lead.description,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setOutreachEmail(data.email || '');
    } catch (err) {
      toast.error(`Could not generate email: ${err.message}`);
    } finally {
      setDraftingEmail(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outreachEmail).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const newNote = await addInteraction(lead.id, noteText.trim());
      // Prepend so newest is first
      setInteractions((prev) => [newNote, ...prev]);
      setNoteText('');
      toast.success('Note saved');
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel lead-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="modal-header">
          <div className="modal-title">
            <h2>{lead.business_name}</h2>
            <span
              className="lead-status-badge"
              style={{ backgroundColor: statusColors[lead.status] || statusColors.new }}
            >
              {lead.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* ─── Body ───────────────────────────────────────────────────── */}
        <div className="modal-body">
          {lead.industry && <p className="lead-industry">{lead.industry}</p>}

          {/* Quick contact row */}
          <div className="lead-contact-row">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="lead-contact-chip">
                <Mail size={13} /> {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="lead-contact-chip">
                <Phone size={13} /> {lead.phone}
              </a>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="lead-contact-chip lead-contact-chip--wa"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
          </div>

          <div className="lead-info-grid">
            {lead.contact_name && (
              <div className="lead-info-item">
                <span className="label">Contact</span>
                <span className="value">{lead.contact_name}</span>
              </div>
            )}
            {lead.website && (
              <div className="lead-info-item">
                <span className="label">Website</span>
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="value link"
                >
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
                <span className="value priority">
                  {Math.round(lead.priority_score * 100)}%
                </span>
              </div>
            )}
            {lead.source && (
              <div className="lead-info-item">
                <span className="label">Source</span>
                <span className="value">{lead.source}</span>
              </div>
            )}
            {lead.followUpDate && (
              <div className="lead-info-item">
                <span className="label">Follow-up Date</span>
                <span className="value">{formatDate(lead.followUpDate)}</span>
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

          {/* ─── AI Outreach ──────────────────────────────────────────── */}
          <div className="lead-outreach-section">
            <button
              className="btn btn-outline btn-sm outreach-trigger"
              onClick={handleDraftEmail}
              disabled={draftingEmail}
            >
              {draftingEmail ? (
                <>
                  <Loader2 size={14} className="spin-icon" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Draft Outreach Email
                </>
              )}
            </button>

            {outreachEmail && (
              <div className="outreach-result">
                <div className="outreach-result-header">
                  <span className="label">AI Outreach Draft</span>
                  <button
                    className="btn-icon-sm"
                    onClick={handleCopy}
                    title="Copy to clipboard"
                  >
                    {copied ? <CheckCheck size={14} color="#22C55E" /> : <Copy size={14} />}
                  </button>
                </div>
                <textarea
                  className="outreach-textarea"
                  value={outreachEmail}
                  onChange={(e) => setOutreachEmail(e.target.value)}
                  rows={10}
                />
              </div>
            )}
          </div>

          {/* ─── Interaction Notes ────────────────────────────────────── */}
          <div className="lead-interactions-section">
            <div className="interactions-header">
              <MessageSquarePlus size={15} />
              <span className="label">Interaction Notes</span>
            </div>

            <div className="interactions-add">
              <textarea
                className="interaction-input"
                placeholder="Add a note or interaction log..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
                }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddNote}
                disabled={savingNote || !noteText.trim()}
              >
                {savingNote ? <Loader2 size={13} className="spin-icon" /> : 'Add Note'}
              </button>
            </div>

            {loadingInteractions ? (
              <div className="interactions-loading">
                <Loader2 size={16} className="spin-icon" />
              </div>
            ) : interactions.length === 0 ? (
              <p className="interactions-empty">No notes yet.</p>
            ) : (
              <ul className="interactions-list">
                {interactions.map((note) => (
                  <li key={note.id} className="interaction-item">
                    <p className="interaction-text">{note.text}</p>
                    <span className="interaction-date">{formatDate(note.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ─── Footer ─────────────────────────────────────────────────── */}
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
