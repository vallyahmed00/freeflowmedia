import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Edit3, Copy, ChevronLeft, ChevronRight, Sparkles, Film, Image, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateGenerationOutput } from '../services/contentStudioService';

const TYPE_META = {
  post:  { label: 'Post',  icon: Image,  color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  reel:  { label: 'Reel',  icon: Film,   color: '#F472B6', bg: 'rgba(244,114,182,0.12)' },
  story: { label: 'Story', icon: Layers, color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
};

function IdeaCard({ idea }) {
  const meta = TYPE_META[idea.type] || TYPE_META.post;
  const Icon = meta.icon;
  const copyText = idea.type === 'post'
    ? `${idea.caption}\n\n${idea.hashtags || ''}`
    : idea.type === 'reel'
    ? `${idea.hook}\n\n${idea.script}`
    : idea.content;

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${meta.color}30`, borderRadius: 10, padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ background: meta.bg, color: meta.color, borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Icon size={10} /> {meta.label}
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{idea.title}</span>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(copyText); toast.success('Copied'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '0.2rem', display: 'flex', alignItems: 'center' }}>
          <Copy size={11} />
        </button>
      </div>

      {idea.type === 'post' && (
        <>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{idea.caption}</p>
          {idea.hashtags && <p style={{ margin: 0, fontSize: '0.72rem', color: meta.color, opacity: 0.8 }}>{idea.hashtags}</p>}
        </>
      )}
      {idea.type === 'reel' && (
        <>
          <p style={{ margin: 0, fontSize: '0.75rem', fontStyle: 'italic', color: meta.color }}>{idea.hook}</p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{idea.script}</p>
          {idea.duration && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{idea.duration}</span>}
        </>
      )}
      {idea.type === 'story' && (
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{idea.content}</p>
      )}
    </div>
  );
}

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


export default function ContentOutput({ contentType, output, ideasPack, versions, currentVersion, generationId, onRegenerate, onVersionChange, isGenerating }) {
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

  if (contentType === 'Content Ideas Pack' && (ideasPack || isGenerating)) {
    return (
      <div className="cs-output-side">
        <div className="cs-output-header">
          <span className="cs-output-label">{isGenerating ? 'Generating…' : `Content Ideas Pack (${ideasPack?.length ?? 0})`}</span>
          <button className="cs-output-btn" onClick={onRegenerate} disabled={isGenerating} title="Regenerate">
            <RefreshCw size={12} /> Regenerate
          </button>
          {ideasPack && (
            <button className="cs-output-btn" onClick={() => { navigator.clipboard.writeText(output); toast.success('Copied raw'); }} title="Copy all">
              <Copy size={12} /> Copy All
            </button>
          )}
        </div>
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.5rem 0' }}>
          {isGenerating ? (
            <span style={{ color: '#52525B', padding: '1rem' }}>Generating your ideas pack…</span>
          ) : ideasPack?.map((idea, i) => (
            <IdeaCard key={i} idea={idea} />
          ))}
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
