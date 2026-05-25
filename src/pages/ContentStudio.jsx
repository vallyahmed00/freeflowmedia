import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Calendar, Package, RefreshCw, BarChart2, Heart, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import ContentTypePanel from '../components/ContentTypePanel';
import ContentOutput from '../components/ContentOutput';
import BrandVoicePanel from '../components/BrandVoicePanel';
import StudioAnalytics from '../components/StudioAnalytics';
import ContentCalendar from '../components/ContentCalendar';
import BulkGenerator from '../components/BulkGenerator';
import RepurposePanel from '../components/RepurposePanel';
import { generateContent, getGenerations, getBrandVoice } from '../services/contentStudioService';
import './ContentStudio.css';

const TONES_PRIMARY = ['Casual', 'Professional', 'Bold', 'Witty', 'Inspirational', 'Educational'];
const TONES_OVERFLOW = ['Urgent', 'Storytelling', 'Luxury', 'Direct', 'Empathetic'];

const PLACEHOLDERS = {
  'Instagram Caption': 'What\'s the post about? Include any key details, offers, or moments to highlight.',
  'LinkedIn Post': 'Topic, angle, and any data points or personal insight to include.',
  'Cold Outreach': 'Who you\'re contacting, what you\'re offering, and the hook.',
  'Blog Outline': 'The topic and target keyword. Any specific sections you want covered.',
  'Google RSA': 'Product or service, key selling points, and target search intent.',
};

function getPlaceholder(contentType) {
  return PLACEHOLDERS[contentType] || `Describe what you need for this ${contentType}.`;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ContentStudio() {
  const [userEmail, setUserEmail] = useState('guest');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email || 'guest');
    });
    return () => unsubscribe();
  }, []);

  const [activeNav, setActiveNav] = useState('generate');
  const [selectedType, setSelectedType] = useState('Instagram Caption');
  const [selectedCategory, setSelectedCategory] = useState('Social');
  const [tone, setTone] = useState('Professional');
  const [showMoreTones, setShowMoreTones] = useState(false);
  const [brief, setBrief] = useState('');
  const [businessContext, setBusinessContext] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandVoice, setBrandVoice] = useState(null);
  const [output, setOutput] = useState('');
  const [ideasPack, setIdeasPack] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [generationId, setGenerationId] = useState(null);

  useEffect(() => {
    if (userEmail === 'guest') return;
    getBrandVoice(userEmail).then(bv => {
      if (bv) {
        setBrandVoice(bv);
        if (bv.businessName) setBusinessContext(bv.businessName);
        if (bv.targetAudience) setTargetAudience(bv.targetAudience);
      }
    });
    loadHistory();
  }, [userEmail]);

  const loadHistory = useCallback(async () => {
    try {
      const items = await getGenerations(userEmail, 50);
      setHistory(items);
    } catch {
      // history not critical
    }
  }, [userEmail]);

  const handleGenerate = async () => {
    if (!brief.trim()) { toast.error('Add a brief first'); return; }
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await generateContent({
        contentType: selectedType,
        category: selectedCategory,
        tone,
        brief,
        businessContext,
        targetAudience,
        brandVoice,
        userEmail,
      });
      const newVersions = [...versions, result.output].slice(-5);
      setVersions(newVersions);
      setCurrentVersion(newVersions.length - 1);
      setOutput(result.output);
      setIdeasPack(result.ideasPack || null);
      setGenerationId(result.generationId);
      loadHistory();
    } catch (err) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTypeSelect = (type, category) => {
    setSelectedType(type);
    setSelectedCategory(category);
    setOutput('');
    setIdeasPack(null);
    setVersions([]);
    setCurrentVersion(0);
    setGenerationId(null);
  };

  const handleVersionChange = (idx) => {
    if (idx < 0 || idx >= versions.length) return;
    setCurrentVersion(idx);
    setOutput(versions[idx]);
  };

  const handleHistorySelect = (item) => {
    setSelectedType(item.contentType);
    setSelectedCategory(item.category || 'General');
    setOutput(item.output);
    setVersions([item.output]);
    setCurrentVersion(0);
    setGenerationId(item.id);
    setBrief(item.prompt || '');
    setTone(item.tone || 'Professional');
    setActiveNav('generate');
  };

  const initials = userEmail.slice(0, 2).toUpperCase();

  const navItems = [
    { id: 'generate', icon: <Sparkles size={16} />, label: 'Generate' },
    { id: 'calendar', icon: <Calendar size={16} />, label: 'Calendar' },
    { id: 'bulk', icon: <Package size={16} />, label: 'Bulk Pack' },
    { id: 'repurpose', icon: <RefreshCw size={16} />, label: 'Repurpose' },
    { id: 'analytics', icon: <BarChart2 size={16} />, label: 'Analytics' },
    { id: 'brandvoice', icon: <Heart size={16} />, label: 'Brand Voice' },
    { id: 'settings', icon: <Settings size={16} />, label: 'Settings' },
  ];

  const renderMainContent = () => {
    if (activeNav === 'calendar') return <ContentCalendar userEmail={userEmail} history={history} />;
    if (activeNav === 'bulk') return <BulkGenerator userEmail={userEmail} brandVoice={brandVoice} onComplete={loadHistory} />;
    if (activeNav === 'repurpose') return <RepurposePanel userEmail={userEmail} brandVoice={brandVoice} onComplete={loadHistory} />;
    if (activeNav === 'analytics') return <StudioAnalytics userEmail={userEmail} />;
    if (activeNav === 'brandvoice') return (
      <BrandVoicePanel
        userEmail={userEmail}
        onSave={bv => {
          setBrandVoice(bv);
          if (bv.businessName) setBusinessContext(bv.businessName);
          if (bv.targetAudience) setTargetAudience(bv.targetAudience);
        }}
      />
    );
    if (activeNav === 'settings') return (
      <div className="cs-panel-view">
        <div className="cs-panel-header"><Settings size={15} /> Settings</div>
        <div className="cs-panel-body" style={{ color: '#52525B', fontSize: '0.82rem' }}>
          Platform integrations and account settings coming soon.
        </div>
      </div>
    );

    return (
      <>
        <div className="cs-topbar">
          <span className="cs-breadcrumb">{selectedCategory} › <span>{selectedType}</span></span>
          <div className="cs-topbar-sep" />
          <div className="cs-tones">
            {TONES_PRIMARY.map(t => (
              <button key={t} className={`cs-tone-pill${tone === t ? ' active' : ''}`} onClick={() => setTone(t)}>{t}</button>
            ))}
            <div className="cs-tone-more-wrap">
              <button className="cs-tone-more" onClick={e => { e.stopPropagation(); setShowMoreTones(v => !v); }}>
                {TONES_OVERFLOW.includes(tone) ? tone : 'More →'}
              </button>
              {showMoreTones && (
                <div className="cs-tone-overflow">
                  {TONES_OVERFLOW.map(t => (
                    <button key={t} className={`cs-tone-pill${tone === t ? ' active' : ''}`} onClick={() => { setTone(t); setShowMoreTones(false); }}>{t}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="cs-body">
          <div className="cs-form-side">
            <div>
              <div className="cs-form-label">Business / Brand</div>
              <input className="cs-form-input" value={businessContext} onChange={e => setBusinessContext(e.target.value)} placeholder="Your business name or context" />
            </div>
            <div>
              <div className="cs-form-label">Target Audience</div>
              <input className="cs-form-input" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Who is this for?" />
            </div>
            <div>
              <div className="cs-form-label">Brief</div>
              <textarea className="cs-form-textarea" value={brief} onChange={e => setBrief(e.target.value)} placeholder={getPlaceholder(selectedType)} />
            </div>
            {brandVoice?.businessName && (
              <div className="cs-brand-voice-banner">
                <Heart size={12} />
                Brand voice active: {brandVoice.businessName}
              </div>
            )}
            <button className="cs-generate-btn" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles size={15} />
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
          </div>

          <ContentOutput
            contentType={selectedType}
            output={output}
            ideasPack={ideasPack}
            versions={versions}
            currentVersion={currentVersion}
            generationId={generationId}
            onRegenerate={handleGenerate}
            onVersionChange={handleVersionChange}
            isGenerating={isGenerating}
          />
        </div>
      </>
    );
  };

  return (
    <div className="cs-shell" onClick={() => setShowMoreTones(false)}>
      <div className="cs-rail" onClick={e => e.stopPropagation()}>
        {navItems.map(item => (
          <button
            key={item.id}
            className={`cs-rail-btn${activeNav === item.id ? ' active' : ''}`}
            data-tip={item.label}
            onClick={() => setActiveNav(item.id)}
          >
            {item.icon}
          </button>
        ))}
        <div className="cs-rail-spacer" />
        <div className="cs-rail-avatar">{initials}</div>
      </div>

      {activeNav === 'generate' && (
        <ContentTypePanel selectedType={selectedType} onSelect={handleTypeSelect} />
      )}

      <div className="cs-workspace">
        {renderMainContent()}
      </div>

      {activeNav === 'generate' && (
        <div className="cs-history-panel">
          <div className="cs-history-header">History</div>
          <div className="cs-history-list">
            {history.length === 0 ? (
              <div className="cs-history-empty">No generations yet</div>
            ) : history.map(item => (
              <div
                key={item.id}
                className={`cs-history-item${item.id === generationId ? ' active' : ''}`}
                onClick={() => handleHistorySelect(item)}
              >
                <div className="cs-history-type">{item.contentType}</div>
                <div className="cs-history-preview">{item.output}</div>
                <div className="cs-history-time">{formatTime(item.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
