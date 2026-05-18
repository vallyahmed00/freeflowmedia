import React, { useState, useEffect } from 'react';
import { Heart, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { saveBrandVoice } from '../services/contentStudioService';

const EMPTY = {
  businessName: '',
  industry: '',
  targetAudience: '',
  brandWords: ['', '', ''],
  competitors: '',
  coreServices: '',
  location: '',
};

export default function BrandVoicePanel({ userEmail, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('driftStudio_brandVoice');
    if (cached) {
      const parsed = JSON.parse(cached);
      setForm({ ...EMPTY, ...parsed, brandWords: parsed.brandWords?.length ? parsed.brandWords : ['', '', ''] });
    }
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setWord = (i, val) => setForm(f => {
    const words = [...f.brandWords];
    words[i] = val;
    return { ...f, brandWords: words };
  });

  const handleSave = async () => {
    if (!form.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }
    setSaving(true);
    try {
      await saveBrandVoice(userEmail, form);
      toast.success('Brand voice saved');
      onSave?.(form);
    } catch {
      toast.error('Save failed — stored locally only');
      localStorage.setItem('driftStudio_brandVoice', JSON.stringify(form));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cs-panel-view">
      <div className="cs-panel-header">
        <Heart size={15} />
        Brand Voice
      </div>
      <div className="cs-panel-body">
        <div className="cs-bv-panel">
          <div className="cs-bv-grid">
            <div>
              <div className="cs-form-label">Business Name</div>
              <input className="cs-form-input" value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Drift Studio" />
            </div>
            <div>
              <div className="cs-form-label">Industry</div>
              <input className="cs-form-input" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Digital Marketing" />
            </div>
            <div>
              <div className="cs-form-label">Location</div>
              <input className="cs-form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Cape Town, SA" />
            </div>
            <div>
              <div className="cs-form-label">Competitors</div>
              <input className="cs-form-input" value={form.competitors} onChange={e => set('competitors', e.target.value)} placeholder="Agency X, Agency Y" />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="cs-form-label">Target Audience</div>
            <input className="cs-form-input" value={form.targetAudience} onChange={e => set('targetAudience', e.target.value)} placeholder="SMEs in Cape Town looking to grow online" />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="cs-form-label">Core Services</div>
            <textarea className="cs-form-textarea" style={{ minHeight: 60 }} value={form.coreServices} onChange={e => set('coreServices', e.target.value)} placeholder="Social media management, SEO, PPC campaigns, content creation" />
          </div>

          <div className="cs-form-label">Brand Words (3 words that define your voice)</div>
          <div className="cs-bv-words">
            {form.brandWords.map((w, i) => (
              <input key={i} className="cs-form-input cs-bv-word-input" value={w} onChange={e => setWord(i, e.target.value)} placeholder={['Bold', 'Direct', 'Authentic'][i]} />
            ))}
          </div>

          <button className="cs-save-btn" onClick={handleSave} disabled={saving}>
            <Save size={14} style={{ marginRight: 6 }} />
            {saving ? 'Saving…' : 'Save Brand Voice'}
          </button>
        </div>
      </div>
    </div>
  );
}
