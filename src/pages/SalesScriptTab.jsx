import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Copy, RefreshCw, ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateOutreachScript, sendLeadAlert } from '../services/leadHunterService';

const SECTIONS = [
  { key: 'opener',                label: '1. Opener' },
  { key: 'rapport',               label: '2. Rapport' },
  { key: 'painAgitation',         label: '3. Pain Agitation' },
  { key: 'solutionPitch',         label: '4. Solution Pitch' },
  { key: 'objectionPrice',        label: '5. Objection: Price' },
  { key: 'objectionNotInterested', label: '6. Objection: Not Interested' },
  { key: 'close',                 label: '7. Close' },
];

function ScriptSection({ label, content }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="script-section">
      <button className="script-section-header" onClick={() => setOpen(o => !o)}>
        <span>{label}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="script-section-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <p>{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SalesScriptTab({ selectedLead, onChangeLeadClick }) {
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedLead) return;
    setLoading(true);
    try {
      const s = await generateOutreachScript({ lead: selectedLead });
      setScript(s);
    } catch {
      toast.error('Failed to generate script');
    } finally {
      setLoading(false);
    }
  };

  const copyScript = () => {
    if (!script) return;
    const text = SECTIONS.map(s => `${s.label}\n${script[s.key]}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => toast.success('Script copied!'));
  };

  const shareDiscord = async () => {
    if (!script) return;
    const text = SECTIONS.map(s => `**${s.label}**\n${script[s.key]}`).join('\n\n');
    try {
      await sendLeadAlert({
        type: 'single',
        lead: { ...selectedLead, painPoint: text },
        channels: ['discord'],
      });
      toast.success('Script posted to Discord');
    } catch {
      toast.error('Failed to post to Discord');
    }
  };

  const shareWhatsApp = () => {
    if (!script) return;
    const text = encodeURIComponent(
      SECTIONS.map(s => `${s.label}\n${script[s.key]}`).join('\n\n')
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!selectedLead) {
    return (
      <div className="empty-state">
        <p>Select a lead from the Lead Hunter tab to generate a sales script.</p>
      </div>
    );
  }

  return (
    <div className="script-tab">
      <div className="selected-lead-banner">
        <div>
          <div className="selected-lead-name">{selectedLead.name} — {selectedLead.company}</div>
          <div className="selected-lead-pain">{selectedLead.painPoint}</div>
        </div>
        <button className="btn-link" onClick={onChangeLeadClick}>Change lead</button>
      </div>

      <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
        {loading && <Loader2 size={16} className="spin-icon" />}
        {loading ? 'Generating...' : 'Generate Script'}
      </button>

      {script && (
        <>
          <div className="script-sections">
            {SECTIONS.map(s => (
              <ScriptSection key={s.key} label={s.label} content={script[s.key]} />
            ))}
          </div>
          <div className="output-actions">
            <button className="btn btn-ghost btn-sm" onClick={copyScript}>
              <Copy size={14} /> Copy Full Script
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleGenerate} disabled={loading}>
              <RefreshCw size={14} /> Regenerate
            </button>
            <button className="btn btn-ghost btn-sm" onClick={shareDiscord}>
              <MessageSquare size={14} /> Discord
            </button>
            <button className="btn btn-ghost btn-sm" onClick={shareWhatsApp}>
              <Send size={14} /> WhatsApp
            </button>
          </div>
        </>
      )}
    </div>
  );
}
