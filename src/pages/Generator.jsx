import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Loader2, Sparkles, Download, AlertCircle } from 'lucide-react';
import LeadCard from '../components/LeadCard';
import LeadGeneratorModal from '../components/LeadGeneratorModal';
import LeadFormModal from '../components/LeadFormModal';
import LeadDetailModal from '../components/LeadDetailModal';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import {
  getAllLeads,
  addLead,
  updateLead,
  deleteLead,
  searchLeads,
  getLeadStats,
  exportLeadsToCSV,
  subscribeToLeads
} from '../services/contentService';
import './Generator.css';

// Demo mode sample data
const demoLeads = [
  {
    id: 'demo-1',
    business_name: 'TechStart Solutions',
    industry: 'Technology',
    location: 'Cape Town, South Africa',
    status: 'new',
    email: 'contact@techstart.co.za',
    phone: '+27 21 555 0123',
    website: 'techstart.co.za',
    notes: 'Growing SaaS company looking for marketing support',
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-2',
    business_name: 'Green Earth Organics',
    industry: 'E-commerce',
    location: 'Johannesburg, South Africa',
    status: 'contacted',
    email: 'hello@greenearth.co.za',
    phone: '+27 11 555 0456',
    website: 'greenearth.co.za',
    notes: 'Eco-friendly products, needs SEO optimization',
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-3',
    business_name: 'FitLife Studios',
    industry: 'Health & Fitness',
    location: 'Durban, South Africa',
    status: 'interested',
    email: 'info@fitlife.co.za',
    phone: '+27 31 555 0789',
    website: 'fitlife.co.za',
    notes: 'Fitness chain wanting to expand digital presence',
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-4',
    business_name: 'Prime Realty Group',
    industry: 'Real Estate',
    location: 'Pretoria, South Africa',
    status: 'new',
    email: 'leads@primerealty.co.za',
    phone: '+27 12 555 0321',
    website: 'primerealty.co.za',
    notes: 'High-end property developer',
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-5',
    business_name: 'Safari Adventures',
    industry: 'Tourism',
    location: 'Port Elizabeth, South Africa',
    status: 'follow_up',
    email: 'bookings@safariadventures.co.za',
    phone: '+27 41 555 0654',
    website: 'safariadventures.co.za',
    notes: 'Tour operator needing international marketing',
    created_at: new Date().toISOString()
  },
  {
    id: 'demo-6',
    business_name: 'CloudNine Accounting',
    industry: 'Professional Services',
    location: 'Stellenbosch, South Africa',
    status: 'new',
    email: 'info@cloudnineacct.co.za',
    phone: '+27 21 555 0987',
    website: 'cloudnineacct.co.za',
    notes: 'B2B services, interested in PPC campaigns',
    created_at: new Date().toISOString()
  }
];

const Generator = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [stats, setStats] = useState({});
  
  // Check if demo mode is active
  const isDemoMode = localStorage.getItem('demo-mode') === 'true';

  const fetchLeads = useCallback(async () => {
    // If demo mode, use sample data
    if (isDemoMode) {
      setLeads(demoLeads);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [leadsData, statsData] = await Promise.all([
        getAllLeads(statusFilter ? { status: statusFilter } : {}),
        getLeadStats()
      ]);
      setLeads(leadsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Failed to load leads from Firebase');
      // Fallback to demo data if Firebase fails
      setLeads(demoLeads);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isDemoMode]);

  useEffect(() => {
    // If not demo mode, subscribe to real-time updates
    if (!isDemoMode) {
      const unsubscribe = subscribeToLeads((updatedLeads) => {
        if (statusFilter) {
          const filtered = updatedLeads.filter(l => l.status === statusFilter);
          setLeads(filtered);
        } else {
          setLeads(updatedLeads);
        }
        setLoading(false);
      }, statusFilter ? { status: statusFilter } : {});

      // Load stats separately
      getLeadStats().then(setStats).catch(console.error);

      return () => unsubscribe();
    } else {
      setLeads(demoLeads);
      setLoading(false);
    }
  }, [statusFilter, isDemoMode]);

  const handleDeleteLead = async (leadId) => {
    if (isDemoMode) {
      toast.error('Cannot delete leads in demo mode');
      return;
    }
    try {
      await deleteLead(leadId);
      toast.success('Lead deleted');
      setSelectedLead(null);
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleAddLead = async (leadData) => {
    if (isDemoMode) {
      toast.error('Cannot add leads in demo mode');
      return;
    }
    try {
      await addLead({ ...leadData, source: 'manual' });
      toast.success('Lead added successfully');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to add lead');
      throw error;
    }
  };

  const handleUpdateLead = async (leadId, leadData) => {
    if (isDemoMode) {
      toast.error('Cannot update leads in demo mode');
      return;
    }
    try {
      await updateLead(leadId, leadData);
      toast.success('Lead updated');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead');
      throw error;
    }
  };

  const exportToCSV = () => {
    if (leads.length === 0) {
      toast.error('No leads to export');
      return;
    }

    exportLeadsToCSV(leads);
    toast.success('Leads exported to CSV');
  };

  const exportToJSON = () => {
    if (leads.length === 0) {
      toast.error('No leads to export');
      return;
    }

    const jsonContent = JSON.stringify(leads, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `freeflow-leads-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Leads exported to JSON');
  };

  const filteredLeads = leads.filter((lead) =>
    lead.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    lead.industry?.toLowerCase().includes(search.toLowerCase()) ||
    lead.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="generator-page">
      <Toaster position="top-right" />

      {/* Demo Mode Indicator */}
      {isDemoMode && (
        <div style={{
          padding: '0.75rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(24, 24, 27, 0.9))',
          backdropFilter: 'blur(20px)',
          borderRadius: '12px',
          border: '1px solid rgba(147, 51, 234, 0.3)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} color="#9333EA" />
            <div>
              <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                🔥 Demo Mode Active
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Viewing sample leads data. Connect your Apify API key to access real lead generation.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('demo-mode');
              window.location.reload();
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Exit Demo
          </button>
        </div>
      )}

      <div className="generator-header">
        <h1>AI Lead Generator</h1>
        <p>Find and manage potential clients with AI-powered search</p>
      </div>

      <div className="generator-controls">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="interested">Interested</option>
          <option value="not_interested">Not Interested</option>
          <option value="follow_up">Follow Up</option>
          <option value="converted">Converted</option>
        </select>

        <div className="action-buttons">
          <button
            className="btn btn-outline"
            onClick={() => setShowGenerateModal(true)}
          >
            <Sparkles size={16} />
            Generate Leads
          </button>
          <div className="export-dropdown" style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className="btn btn-outline"
              onClick={() => {
                if (leads.length > 0) {
                  exportToCSV();
                } else {
                  toast.error('No leads to export');
                }
              }}
              title="Export to CSV"
            >
              <Download size={16} />
              CSV
            </button>
          </div>
          <button
            className="btn btn-outline"
            onClick={exportToJSON}
            disabled={leads.length === 0}
            title="Export to JSON"
          >
            <Download size={16} />
            JSON
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            Add Lead
          </button>
        </div>
      </div>

      <div className="leads-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.total || leads.length}</span>
          <span className="stat-label">Total Leads</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.new || leads.filter(l => l.status === 'new').length}</span>
          <span className="stat-label">New</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.contacted || leads.filter(l => l.status === 'contacted').length}</span>
          <span className="stat-label">Contacted</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.interested || leads.filter(l => l.status === 'interested').length}</span>
          <span className="stat-label">Interested</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading leads...</p>
        </div>
      ) : (
        <div className="leads-grid">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onSelect={setSelectedLead}
            />
          ))}
        </div>
      )}

      {filteredLeads.length === 0 && !loading && (
        <div className="empty-state">
          <p>No leads found</p>
          <p className="empty-subtitle">
            Try adjusting your search or generate new leads
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowGenerateModal(true)}
          >
            <Sparkles size={16} />
            Generate Leads
          </button>
        </div>
      )}

      <LeadGeneratorModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerated={fetchLeads}
        isDemoMode={isDemoMode}
      />

      <LeadFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={handleAddLead}
        onSave={handleUpdateLead}
        editLead={editingLead}
        isDemoMode={isDemoMode}
      />

      <LeadDetailModal
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onEdit={(lead) => {
          setSelectedLead(null);
          setEditingLead(lead);
          setShowAddModal(true);
        }}
        onDelete={handleDeleteLead}
        isDemoMode={isDemoMode}
      />
    </div>
  );
};

export default Generator;
