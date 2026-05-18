import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateContent, getGenerations } from '../services/contentStudioService';

const REPURPOSE_TARGETS = [
  'LinkedIn Post', 'Twitter / X Thread', 'Instagram Caption',
  'Facebook Post', 'Cold Outreach',
];

export default function RepurposePanel({ userEmail, brandVoice, onComplete }) {
  const [generations, setGenerations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [variants, setVariants] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    getGenerations(userEmail, 30).then(setGenerations).catch(() => {});
  }, [userEmail]);

  const selectedGen = generations.find(g => g.id === selectedId);
  const targets = selectedGen ? REPURPOSE_TARGETS.filter(t => t !== selectedGen.contentType) : REPURPOSE_TARGETS;

  const repurpose = async () => {
    if (!selectedGen) { toast.error('Select a piece to repurpose'); return; }
    setRunning(true);
    setVariants([]);

    for (const target of targets) {
      try {
        const result = await generateContent({
          contentType: target,
          category: 'Social',
          tone: selectedGen.tone || 'Professional',
          brief: `Repurpose the following content for ${target}:\n\n${selectedGen.output}`,
          businessContext: brandVoice?.businessName || '',
          targetAudience: brandVoice?.targetAudience || '',
          brandVoice,
          userEmail,
        });
        setVariants(v => [...v, { platform: target, output: result.output }]);
      } catch {
        setVariants(v => [...v, { platform: target, output: null, error: true }]);
      }
    }

    setRunning(false);
    onComplete?.();
    toast.success('Repurpose complete — variants saved to history');
  };

  return (
    <div className="cs-panel-view">
      <div className="cs-panel-header">
        <RefreshCw size={15} />
        Repurpose Content
      </div>
      <div className="cs-panel-body">
        <div style={{ marginBottom: 16 }}>
          <div className="cs-form-label">Select a piece from history</div>
          <select className="cs-form-input" value={selectedId} onChange={e => { setSelectedId(e.target.value); setVariants([]); }}>
            <option value="">— Choose content to repurpose —</option>
            {generations.map(g => (
              <option key={g.id} value={g.id}>{g.contentType}: {g.output?.slice(0, 50)}…</option>
            ))}
          </select>
        </div>

        {selectedGen && (
          <div className="cs-repurpose-source">
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9333EA', textTransform: 'uppercase', marginBottom: 6 }}>
              {selectedGen.contentType}
            </div>
            {selectedGen.output?.slice(0, 200)}{selectedGen.output?.length > 200 ? '…' : ''}
          </div>
        )}

        {selectedGen && !running && variants.length === 0 && (
          <button className="cs-generate-btn" onClick={repurpose}>
            <RefreshCw size={15} />
            Repurpose to {targets.length} Platforms
          </button>
        )}

        {running && (
          <div style={{ color: '#52525B', fontSize: '0.8rem', marginBottom: 12 }}>
            Generating variants… {variants.length} of {targets.length} done
          </div>
        )}

        {variants.map((v, idx) => (
          <div key={idx} className="cs-repurpose-variant">
            <div className="cs-repurpose-platform">{v.platform}</div>
            {v.error ? (
              <div style={{ color: '#EF4444', fontSize: '0.75rem' }}>Generation failed for this platform</div>
            ) : (
              <>
                <div className="cs-repurpose-text">{v.output}</div>
                <button className="cs-share-btn" style={{ marginTop: 8 }} onClick={() => { navigator.clipboard.writeText(v.output); toast.success('Copied'); }}>
                  <Copy size={10} /> Copy
                </button>
              </>
            )}
          </div>
        ))}

        {!running && variants.length > 0 && (
          <button className="cs-generate-btn" style={{ marginTop: 16 }} onClick={() => { setVariants([]); setSelectedId(''); }}>
            Repurpose Another Piece
          </button>
        )}
      </div>
    </div>
  );
}
