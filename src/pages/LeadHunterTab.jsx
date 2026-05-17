import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Settings, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import LeadCard from '../components/LeadCard';
import { generateAILeads, sendLeadAlert, exportLeadsToPDF } from '../services/leadHunterService';

const NICHES = [
  'E-commerce', 'Restaurants', 'Real Estate',
  'Fitness', 'Law Firms', 'SaaS',
  'Dental', 'Coaches', 'Retail',
];

const SIZES = ['Any', '1–10', '11–50', '51–200'];

const SETTINGS_KEY = 'drift_lead_notify_settings';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { discord: false, telegram: false, whatsapp: false, whatsappNumber: '' };
  } catch {
    return { discord: false, telegram: false, whatsapp: false, whatsappNumber: '' };
  }
}

export default function LeadHunterTab({ onUseLead }) {
  const [niche, setNiche] = useState('SaaS');
  const [location, setLocation] = useState('Johannesburg, SA');
  const [companySize, setCompanySize] = useState('Any');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifySettings, setNotifySettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(notifySettings));
  }, [notifySettings]);

  const hotCount = leads.filter(l => l.temperature === 'hot').length;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const newLeads = await generateAILeads({ niche, location, companySize });
      setLeads(prev => [...newLeads, ...prev]);
      toast.success(`5 leads generated for ${niche} in ${location}`);

      const channels = [];
      if (notifySettings.discord) channels.push('discord');
      if (notifySettings.telegram) channels.push('telegram');
      if (channels.length > 0) {
        await sendLeadAlert({ type: 'batch', leads: newLeads, channels, niche, location });
      }
    } catch (err) {
      toast.error('Failed to generate leads. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlert = async ({ type, lead, channels }) => {
    try {
      await sendLeadAlert({
        type,
        lead,
        channels,
        whatsappTo: notifySettings.whatsappNumber || undefined,
      });
      toast.success(`Sent to ${channels.join(' & ')}`);
    } catch {
      toast.error('Failed to send alert');
    }
  };

  const handleExportPDF = () => {
    if (leads.length === 0) return toast.error('Generate leads first');
    exportLeadsToPDF(leads, { niche, location });
    toast.success('PDF downloaded');
  };

  return (
    <div className="lead-hunter-tab">
      <div className="lead-hunter-topbar">
        <h2 className="tab-section-title">Lead Hunter</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {leads.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleExportPDF}>
              <FileText size={14} /> PDF
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(o => !o)}>
            <Settings size={14} /> Settings
          </button>
        </div>
      </div>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="settings-panel glass-card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="settings-panel-header">
              <span>Notification Channels</span>
              <button className="icon-btn" onClick={() => setSettingsOpen(false)}><X size={14} /></button>
            </div>
            <div className="settings-toggles">
              {['discord', 'telegram'].map(ch => (
                <label key={ch} className="settings-toggle">
                  <span style={{ textTransform: 'capitalize' }}>{ch}</span>
                  <input
                    type="checkbox"
                    checked={notifySettings[ch]}
                    onChange={e => setNotifySettings(s => ({ ...s, [ch]: e.target.checked }))}
                  />
                </label>
              ))}
              <label className="settings-toggle">
                <span>WhatsApp</span>
                <input
                  type="checkbox"
                  checked={notifySettings.whatsapp}
                  onChange={e => setNotifySettings(s => ({ ...s, whatsapp: e.target.checked }))}
                />
              </label>
              {notifySettings.whatsapp && (
                <input
                  className="settings-input"
                  type="tel"
                  placeholder="+27 82 000 0000"
                  value={notifySettings.whatsappNumber}
                  onChange={e => setNotifySettings(s => ({ ...s, whatsappNumber: e.target.value }))}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="niche-grid">
        {NICHES.map(n => (
          <button
            key={n}
            className={`niche-tile ${niche === n ? 'niche-tile--active' : ''}`}
            onClick={() => setNiche(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="hunter-controls">
        <input
          className="hunter-input"
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Location"
        />
        <select
          className="hunter-select"
          value={companySize}
          onChange={e => setCompanySize(e.target.value)}
        >
          {SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading && <Loader2 size={16} className="spin-icon" />}
          {loading ? 'Generating...' : 'Generate 5 Leads'}
        </button>
      </div>

      {leads.length > 0 && (
        <div className="stats-strip">
          <span>{leads.length} generated this session</span>
          <span>{hotCount} hot prospects</span>
          <span>{leads.length} saved to pipeline</span>
        </div>
      )}

      <div className="ai-leads-grid">
        <AnimatePresence>
          {leads.map((lead, i) => (
            <LeadCard
              key={lead.id || i}
              lead={lead}
              aiMode
              index={i}
              onUseLead={onUseLead}
              onSendAlert={handleSendAlert}
            />
          ))}
        </AnimatePresence>
      </div>

      {leads.length === 0 && !loading && (
        <div className="empty-state">
          <p>Select a niche and generate leads to get started.</p>
        </div>
      )}
    </div>
  );
}
