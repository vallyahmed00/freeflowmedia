import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Edit3, Copy, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateGenerationOutput } from '../services/contentStudioService';

const CHAR_LIMITS = {
  'Instagram Caption': 2200,
  'Instagram Carousel': 2200,
  'Twitter / X Thread': 280,
  'LinkedIn Post': 3000,
  'Facebook Post': 63206,
  'TikTok Script': 2200,
  'Pinterest Description': 500,
  'Google RSA': 90,
  'Meta Tags': 160,
  'Cold Outreach': 200,
  'Newsletter': 5000,
  '3-Email Drip Sequence': 5000,
  'Promotional Email': 3000,
  'Re-engagement Email': 3000,
  'Hero Headline': 100,
};

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ContentOutput({ contentType, output, versions, currentVersion, generationId, onRegenerate, onVersionChange, isGenerating }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const contentRef = useRef(null);

  const limit = CHAR_LIMITS[contentType] || null;
  const charCount = output?.length || 0;
  const pct = limit ? Math.min(100, (charCount / limit) * 100) : 0;
  const hashCount = output ? (output.match(/#\w+/g) || []).length : 0;

  useEffect(() => {
    setEditing(false);
  }, [output]);

  const startEdit = () => {
    setEditText(output || '');
    setEditing(true);
    setTimeout(() => contentRef.current?.focus(), 50);
  };

  const saveEdit = async () => {
    if (!generationId || editText === output) { setEditing(false); return; }
    try {
      await updateGenerationOutput(generationId, editText);
      toast.success('Saved');
    } catch {
      toast.error('Save failed');
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') saveEdit();
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => toast.success('Copied to clipboard'));
  };

  if (!output && !isGenerating) {
    return (
      <div className="cs-output-side">
        <div className="cs-output-header">
          <span className="cs-output-label">Output</span>
        </div>
        <div className="cs-output-placeholder">
          <Sparkles size={32} />
          <div>Fill in the brief and click Generate</div>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-output-side">
      <div className="cs-output-header">
        <span className="cs-output-label">
          {isGenerating ? 'Generating…' : contentType}
        </span>
        <button className="cs-output-btn" onClick={onRegenerate} disabled={isGenerating} title="Regenerate">
          <RefreshCw size={12} /> Regenerate
        </button>
        <button className="cs-output-btn" onClick={startEdit} disabled={isGenerating || !output} title="Edit">
          <Edit3 size={12} /> Edit
        </button>
        <button className="cs-output-btn" onClick={copyToClipboard} disabled={!output} title="Copy">
          <Copy size={12} /> Copy
        </button>
      </div>

      {editing ? (
        <textarea
          ref={contentRef}
          className="cs-output-content editing"
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          style={{ resize: 'none' }}
        />
      ) : (
        <div
          className="cs-output-content"
          onClick={output ? startEdit : undefined}
          style={{ cursor: output ? 'text' : 'default' }}
        >
          {isGenerating ? (
            <span style={{ color: '#52525B' }}>Writing your {contentType}…</span>
          ) : output}
        </div>
      )}

      {limit && output && (
        <div className="cs-char-bar">
          <div className="cs-char-track">
            <div className={`cs-char-fill${pct >= 100 ? ' over' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {output && (
        <>
          <div className="cs-meta-row">
            <span className="cs-meta-chip">{charCount.toLocaleString()} chars</span>
            {limit && <span className="cs-meta-chip">/ {limit.toLocaleString()}</span>}
            {hashCount > 0 && <span className="cs-meta-chip">{hashCount} hashtags</span>}
            <span className="cs-meta-chip version">Version {currentVersion + 1} of {versions.length}</span>
            <div className="cs-version-nav">
              <button onClick={() => onVersionChange(currentVersion - 1)} disabled={currentVersion === 0}>
                <ChevronLeft size={10} />
              </button>
              <button onClick={() => onVersionChange(currentVersion + 1)} disabled={currentVersion === versions.length - 1}>
                <ChevronRight size={10} />
              </button>
            </div>
          </div>
          <div className="cs-share-row">
            <button className="cs-share-btn" onClick={copyToClipboard}>
              <Copy size={10} /> Copy
            </button>
            <button className="cs-share-btn" onClick={() => {
              const blob = new Blob([output], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `${contentType.replace(/\s/g, '_')}.txt`;
              a.click(); URL.revokeObjectURL(url);
            }}>
              Download
            </button>
          </div>
        </>
      )}
    </div>
  );
}
