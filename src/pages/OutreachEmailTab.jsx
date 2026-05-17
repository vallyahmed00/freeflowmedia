import { useState } from 'react';
import { Loader2, Copy, RefreshCw, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateOutreachEmail, sendLeadAlert } from '../services/leadHunterService';

const TONES = ['Professional', 'Casual', 'Direct'];

export default function OutreachEmailTab({ selectedLead, onChangeLeadClick }) {
  const [tone, setTone] = useState('Professional');
  const [emailContent, setEmailContent] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedLead) return;
    setLoading(true);
    try {
      const content = await generateOutreachEmail({ lead: selectedLead, tone });
      const lines = content.split('\n').filter(Boolean);
      const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
      if (subjectLine) {
        setSubject(subjectLine.replace(/^subject:\s*/i, ''));
        setEmailContent(lines.filter(l => !l.toLowerCase().startsWith('subject:')).join('\n'));
      } else {
        setSubject('');
        setEmailContent(content);
      }
    } catch {
      toast.error('Failed to generate email');
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    const text = subject ? `Subject: ${subject}\n\n${emailContent}` : emailContent;
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
  };

  const shareDiscord = async () => {
    if (!emailContent) return;
    try {
      await sendLeadAlert({
        type: 'single',
        lead: {
          ...selectedLead,
          painPoint: `EMAIL DRAFT:\n\nSubject: ${subject}\n\n${emailContent}`,
        },
        channels: ['discord'],
      });
      toast.success('Draft posted to Discord');
    } catch {
      toast.error('Failed to post to Discord');
    }
  };

  const shareWhatsApp = () => {
    if (!emailContent) return;
    const text = encodeURIComponent(`Subject: ${subject}\n\n${emailContent}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareiMessage = () => {
    if (!emailContent) return;
    const text = encodeURIComponent(`Subject: ${subject}\n\n${emailContent}`);
    window.open(`sms:?body=${text}`);
  };

  if (!selectedLead) {
    return (
      <div className="empty-state">
        <p>Select a lead from the Lead Hunter tab to generate an outreach email.</p>
      </div>
    );
  }

  return (
    <div className="outreach-tab">
      <div className="selected-lead-banner">
        <div>
          <div className="selected-lead-name">{selectedLead.name} — {selectedLead.company}</div>
          <div className="selected-lead-pain">{selectedLead.painPoint}</div>
        </div>
        <button className="btn-link" onClick={onChangeLeadClick}>Change lead</button>
      </div>

      <div className="tone-selector">
        {TONES.map(t => (
          <button
            key={t}
            className={`tone-btn ${tone === t ? 'tone-btn--active' : ''}`}
            onClick={() => setTone(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
        {loading && <Loader2 size={16} className="spin-icon" />}
        {loading ? 'Generating...' : 'Generate Email'}
      </button>

      {emailContent && (
        <div className="email-output">
          <input
            className="email-subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject line..."
          />
          <textarea
            className="email-body"
            value={emailContent}
            onChange={e => setEmailContent(e.target.value)}
            rows={10}
          />
          <div className="output-actions">
            <button className="btn btn-ghost btn-sm" onClick={copyAll}>
              <Copy size={14} /> Copy
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleGenerate} disabled={loading}>
              <RefreshCw size={14} /> Regenerate
            </button>
            <button className="btn btn-ghost btn-sm" onClick={shareDiscord}>
              <MessageSquare size={14} /> Discord
            </button>
            <button className="btn btn-ghost btn-sm" onClick={shareWhatsApp}>
              <MessageSquare size={14} /> WhatsApp
            </button>
            <button className="btn btn-ghost btn-sm" onClick={shareiMessage}>
              <Send size={14} /> iMessage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
