import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Loader2, Sparkles, Download } from 'lucide-react';
import { leadApi } from '../services/leadApi';
import LeadCard from '../components/LeadCard';
import LeadGeneratorModal from '../components/LeadGeneratorModal';
import LeadFormModal from '../components/LeadFormModal';
import LeadDetailModal from '../components/LeadDetailModal';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import './Generator.css';

const Generator = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await leadApi.fetchLeads(params);
      setLeads(data);
    } catch {
      console.error('Failed to fetch leads');
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDeleteLead = async (leadId) => {
    try {
      await leadApi.deleteLead(leadId);
      toast.success('Lead deleted');
      setSelectedLead(null);
      fetchLeads();
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const exportToCSV = () => {
    if (leads.length === 0) {
      toast.error('No leads to export');
      return;
    }

    const headers = ['Business Name', 'Industry', 'Location', 'Status', 'Email', 'Phone', 'Website', 'Notes', 'Created At'];
    const csvData = leads.map(lead => [
      lead.business_name || '',
      lead.industry || '',
      lead.location || '',
      lead.status || '',
      lead.email || '',
      lead.phone || '',
      lead.website || '',
      lead.notes || '',
      lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `freeflow-leads-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

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
          <span className="stat-value">{leads.length}</span>
          <span className="stat-label">Total Leads</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {leads.filter(l => l.status === 'new').length}
          </span>
          <span className="stat-label">New</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {leads.filter(l => l.status === 'contacted').length}
          </span>
          <span className="stat-label">Contacted</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {leads.filter(l => l.status === 'interested').length}
          </span>
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
      />

      <LeadFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={fetchLeads}
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
      />

      {editingLead && showAddModal && (
        <LeadFormModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingLead(null);
          }}
          onSaved={() => {
            fetchLeads();
            setEditingLead(null);
          }}
          editLead={editingLead}
        />
      )}
    </div>
  );
};

export default Generator;
