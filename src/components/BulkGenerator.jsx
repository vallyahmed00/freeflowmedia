import React, { useState } from 'react';
import { Package, Check, Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateContent } from '../services/contentStudioService';

const BULK_PACK = [
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 1' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 2' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 3' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 4' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 5' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 6' },
  { contentType: 'Instagram Caption', category: 'Social', label: 'Instagram Caption 7' },
  { contentType: 'LinkedIn Post', category: 'Social', label: 'LinkedIn Post 1' },
  { contentType: 'LinkedIn Post', category: 'Social', label: 'LinkedIn Post 2' },
  { contentType: 'LinkedIn Post', category: 'Social', label: 'LinkedIn Post 3' },
  { contentType: 'Cold Outreach', category: 'Email', label: 'Cold Outreach Email 1' },
  { contentType: 'Cold Outreach', category: 'Email', label: 'Cold Outreach Email 2' },
  { contentType: 'Blog Outline', category: 'Long Form', label: 'Blog Outline' },
];

export default function BulkGenerator({ userEmail, brandVoice, onComplete }) {
  const [brief, setBrief] = useState('');
  const [items, setItems] = useState(BULK_PACK.map(p => ({ ...p, status: 'pending', output: null })));
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const updateItem = (idx, patch) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));

  const run = async () => {
    if (!brief.trim()) { toast.error('Add a brief for the pack'); return; }
    setRunning(true);
    setDone(false);
    setItems(BULK_PACK.map(p => ({ ...p, status: 'pending', output: null })));

    for (let i = 0; i < BULK_PACK.length; i++) {
      const item = BULK_PACK[i];
      updateItem(i, { status: 'active' });
      try {
        const result = await generateContent({
          contentType: item.contentType,
          category: item.category,
          tone: 'Professional',
          brief,
          businessContext: brandVoice?.businessName || '',
          targetAudience: brandVoice?.targetAudience || '',
          brandVoice,
          userEmail,
        });
        updateItem(i, { status: 'done', output: result.output });
      } catch (err) {
        updateItem(i, { status: 'error' });
        if (err.message?.includes('Rate limit')) {
          toast.error('Rate limit hit — pausing 60s');
          await new Promise(r => setTimeout(r, 60000));
          i--;
        }
      }
    }

    setRunning(false);
    setDone(true);
    onComplete?.();
    toast.success('Bulk pack complete — 13 pieces saved to history');
  };

  const completedCount = items.filter(i => i.status === 'done').length;

  return (
    <div className="cs-panel-view">
      <div className="cs-panel-header">
        <Package size={15} />
        Bulk Generation Pack
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#52525B' }}>
          {running ? `${completedCount} of ${BULK_PACK.length}` : `${BULK_PACK.length} pieces`}
        </span>
      </div>
      <div className="cs-panel-body">
        {!running && !done && (
          <div style={{ marginBottom: 16 }}>
            <div className="cs-form-label" style={{ marginBottom: 6 }}>What is your business / campaign about?</div>
            <textarea className="cs-form-textarea" value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe your business, current campaign, or key message. All 13 pieces will be tailored to this." style={{ minHeight: 80 }} />
            <button className="cs-generate-btn" style={{ marginTop: 12 }} onClick={run}>
              <Package size={15} />
              Generate All 13 Pieces
            </button>
          </div>
        )}

        {running && (
          <div className="cs-progress-bar" style={{ marginBottom: 16 }}>
            <div className="cs-progress-fill" style={{ width: `${(completedCount / BULK_PACK.length) * 100}%` }} />
          </div>
        )}

        {items.map((item, idx) => (
          <div key={idx} className="cs-bulk-item">
            <div className={`cs-bulk-status ${item.status}`}>
              {item.status === 'done' && <Check size={10} />}
              {item.status === 'active' && <Loader size={10} />}
              {item.status === 'error' && <AlertCircle size={10} />}
              {item.status === 'pending' && idx + 1}
            </div>
            <div className="cs-bulk-label">{item.label}</div>
            {item.status === 'done' && <span style={{ fontSize: '0.65rem', color: '#4ADE80' }}>Saved</span>}
          </div>
        ))}

        {done && (
          <button className="cs-generate-btn" style={{ marginTop: 16 }} onClick={() => { setDone(false); setItems(BULK_PACK.map(p => ({ ...p, status: 'pending', output: null }))); setBrief(''); }}>
            <Package size={15} />
            Generate Another Pack
          </button>
        )}
      </div>
    </div>
  );
}
