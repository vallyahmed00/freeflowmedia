import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import LeadHunterTab from './LeadHunterTab';
import OutreachEmailTab from './OutreachEmailTab';
import SalesScriptTab from './SalesScriptTab';
import './Generator.css';

const TABS = [
  { id: 'hunter', label: '🎯 Lead Hunter' },
  { id: 'email',  label: '✉️ Outreach Email' },
  { id: 'script', label: '📞 Sales Script' },
];

export default function Generator() {
  const [activeTab, setActiveTab] = useState('hunter');
  const [selectedLead, setSelectedLead] = useState(null);

  const handleUseLead = (lead) => {
    setSelectedLead(lead);
    setActiveTab('email');
  };

  const handleChangeLead = () => {
    setActiveTab('hunter');
  };

  return (
    <div className="generator-page">
      <Toaster position="top-right" />
      <div className="container">
        <div className="generator-header">
          <h1 className="gradient-text">Lead Intelligence</h1>
          <p>AI-powered prospect discovery, outreach, and sales scripts</p>
        </div>

        <div className="tab-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="tab-content"
          >
            {activeTab === 'hunter' && (
              <LeadHunterTab onUseLead={handleUseLead} />
            )}
            {activeTab === 'email' && (
              <OutreachEmailTab
                selectedLead={selectedLead}
                onChangeLeadClick={handleChangeLead}
              />
            )}
            {activeTab === 'script' && (
              <SalesScriptTab
                selectedLead={selectedLead}
                onChangeLeadClick={handleChangeLead}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
