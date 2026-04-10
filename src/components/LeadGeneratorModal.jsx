import React, { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { leadApi } from '../services/leadApi';
import toast from 'react-hot-toast';
import './LeadGeneratorModal.css';
import './Modal.css';

const LeadGeneratorModal = ({ isOpen, onClose, onGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [params, setParams] = useState({
    query: '',
    location: 'South Africa',
    industry: '',
    source: 'all',
    max_results: 20,
  });

  const handleGenerate = async () => {
    if (!params.query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await leadApi.searchLeads(params);
      toast.success(`Generated ${result.new_leads?.length || 0} new leads from ${result.total_found} found`);
      onGenerated && onGenerated(result);
      onClose();
      setParams({
        query: '',
        location: 'South Africa',
        industry: '',
        source: 'all',
        max_results: 20,
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate leads');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles className="sparkle-icon" />
            <h2>Generate Leads with AI</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="modal-subtitle">
          Search for businesses using Apify to find potential clients
        </p>

        <div className="modal-form">
          <div className="form-group">
            <label>Search Query *</label>
            <input
              type="text"
              value={params.query}
              onChange={(e) => setParams({ ...params, query: e.target.value })}
              placeholder="e.g., digital marketing agency, restaurants, fitness gyms"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={params.location}
                onChange={(e) => setParams({ ...params, location: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Industry</label>
              <input
                type="text"
                value={params.industry}
                onChange={(e) => setParams({ ...params, industry: e.target.value })}
                placeholder="e.g., Technology, Finance"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Source</label>
              <select
                value={params.source}
                onChange={(e) => setParams({ ...params, source: e.target.value })}
              >
                <option value="all">All Sources</option>
                <option value="google_maps">Google Maps</option>
                <option value="linkedin">LinkedIn</option>
                <option value="google_search">Google Search</option>
                <option value="yellow_pages">Yellow Pages</option>
                <option value="yelp">Yelp</option>
                <option value="twitter">Twitter</option>
              </select>
            </div>
            <div className="form-group">
              <label>Max Results</label>
              <input
                type="number"
                value={params.max_results}
                onChange={(e) => setParams({ ...params, max_results: parseInt(e.target.value) || 20 })}
                min={5}
                max={50}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="spin-icon" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Leads
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadGeneratorModal;
