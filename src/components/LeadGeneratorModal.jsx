import React, { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { leadApi } from '../services/leadApi';
import toast from 'react-hot-toast';
import './LeadGeneratorModal.css';
import './Modal.css';

const COUNTRIES = [
  'South Africa', 'Zimbabwe', 'Botswana', 'Namibia', 'Zambia',
  'Mozambique', 'Kenya', 'Nigeria', 'United Kingdom', 'United States', 'Australia',
];

const SA_PROVINCES = [
  'Gauteng', 'Western Cape', 'Eastern Cape', 'KwaZulu-Natal',
  'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape',
];

const SELECT_STYLE = {
  padding: '0.5rem 0.75rem',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: 'inherit',
  fontSize: '0.9rem',
  width: '100%',
  cursor: 'pointer',
};

const LeadGeneratorModal = ({ isOpen, onClose, onGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [params, setParams] = useState({
    query: '',
    country: 'South Africa',
    province: '',
    city: '',
    industry: '',
    max_results: 20,
  });

  const handleGenerate = async () => {
    if (!params.query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsGenerating(true);
    try {
      const location = params.city
        ? `${params.city}, ${params.province || params.country}`
        : params.province
        ? `${params.province}, ${params.country}`
        : params.country;

      const searchParams = {
        query: params.industry
          ? `${params.query} ${params.industry}`
          : params.query,
        location,
        max_results: params.max_results,
      };

      const result = await leadApi.searchLeads(searchParams);
      const incoming = result.new_leads || result.leads || [];

      await Promise.all(
        incoming.map(lead =>
          leadApi.createLead({
            business_name: lead.business_name || lead.name || '',
            contact_name: lead.contact_name || '',
            email: lead.email || '',
            phone: lead.phone || '',
            website: lead.website || '',
            industry: lead.industry || lead.category || params.industry || '',
            location: lead.location || lead.address || params.location || '',
            source: 'lead_generator',
            status: 'new',
            notes: lead.notes || lead.description || '',
          })
        )
      );

      toast.success(`Saved ${incoming.length} leads`);
      onGenerated && onGenerated(result);
      onClose();
      setParams({
        query: '',
        country: 'South Africa',
        province: '',
        city: '',
        industry: '',
        max_results: 20,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to generate leads');
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
          Search for businesses on Google Maps to find potential clients
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
              <label>Country</label>
              <select
                value={params.country}
                onChange={(e) => setParams({ ...params, country: e.target.value, province: '' })}
                style={SELECT_STYLE}
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {params.country === 'South Africa' ? (
              <div className="form-group">
                <label>Province</label>
                <select
                  value={params.province}
                  onChange={(e) => setParams({ ...params, province: e.target.value })}
                  style={SELECT_STYLE}
                >
                  <option value="">All provinces</option>
                  {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Region / City</label>
                <input
                  type="text"
                  value={params.city}
                  onChange={(e) => setParams({ ...params, city: e.target.value })}
                  placeholder="e.g., London, Lagos"
                />
              </div>
            )}
          </div>

          {params.country === 'South Africa' && (
            <div className="form-row">
              <div className="form-group">
                <label>City <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(optional)</span></label>
                <input
                  type="text"
                  value={params.city}
                  onChange={(e) => setParams({ ...params, city: e.target.value })}
                  placeholder="e.g., Cape Town, Johannesburg"
                />
              </div>
              <div className="form-group">
                <label>Industry <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(refines search)</span></label>
                <input
                  type="text"
                  value={params.industry}
                  onChange={(e) => setParams({ ...params, industry: e.target.value })}
                  placeholder="e.g., Technology, Finance"
                />
              </div>
            </div>
          )}

          {params.country !== 'South Africa' && (
            <div className="form-row">
              <div className="form-group">
                <label>Industry <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(refines search)</span></label>
                <input
                  type="text"
                  value={params.industry}
                  onChange={(e) => setParams({ ...params, industry: e.target.value })}
                  placeholder="e.g., Technology, Finance"
                />
              </div>
            </div>
          )}

          <div className="form-row">
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
