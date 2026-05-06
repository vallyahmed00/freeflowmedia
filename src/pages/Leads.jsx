import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Sparkles, Download, LayoutGrid, Columns, Trash2,
  UserCheck, RefreshCw, TrendingUp, Users, Target, Star,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import LeadCard from '../components/LeadCard';
import LeadDetailModal from '../components/LeadDetailModal';
import LeadFormModal from '../components/LeadFormModal';
import LeadGeneratorModal from '../components/LeadGeneratorModal';
import {
  fetchLeads, updateLead, deleteLead,
  bulkDeleteLeads, bulkUpdateStatus, getDashboardStats, exportLeadsToCSV
} from '../services/leadApi';

const STATUS_COLS = [
  { key: 'new',           label: 'New',         color: '#10B981' },
  { key: 'contacted',     label: 'Contacted',   color: '#3B82F6' },
  { key: 'interested',    label: 'Interested',  color: '#8B5CF6' },
  { key: 'follow_up',     label: 'Follow Up',   color: '#F59E0B' },
  { key: 'converted',     label: 'Converted',   color: '#22C55E' },
];

const STATUS_FILTER_TABS = [
  { key: 'all', label: 'All' },
  ...STATUS_COLS,
  { key: 'not_interested', label: 'Not Interested', color: '#EF4444' },
];

const SORT_OPTIONS = [
  { value: 'newest',       label: 'Newest first' },
  { value: 'oldest',       label: 'Oldest first' },
  { value: 'priority_desc', label: 'Priority: high → low' },
  { value: 'priority_asc',  label: 'Priority: low → high' },
  { value: 'name_asc',     label: 'Name A → Z' },
];

const sortLeads = (leads, sort) => {
  const copy = [...leads];
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    case 'priority_desc':
      return copy.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    case 'priority_asc':
      return copy.sort((a, b) => (a.priority_score || 0) - (b.priority_score || 0));
    case 'name_asc':
      return copy.sort((a, b) => (a.business_name || '').localeCompare(b.business_name || ''));
    default: // newest
      return copy.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [selectedLead, setSelectedLead] = useState(null);
  const [editLead, setEditLead] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [leadsData, statsData] = await Promise.all([fetchLeads(), getDashboardStats()]);
      setLeads(leadsData);
      setStats(statsData);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const filtered = statusFilter === 'all'
    ? leads
    : leads.filter(l => l.status === statusFilter);

  const displayed = sortLeads(filtered, sort);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} lead(s)? This cannot be undone.`)) return;
    try {
      await bulkDeleteLeads([...selectedIds]);
      toast.success(`Deleted ${selectedIds.size} lead(s)`);
      clearSelection();
      loadData();
    } catch { toast.error('Bulk delete failed'); }
  };

  const handleBulkStatus = async (status) => {
    try {
      await bulkUpdateStatus([...selectedIds], status);
      toast.success(`${selectedIds.size} lead(s) marked as ${status.replace('_', ' ')}`);
      clearSelection();
      loadData();
    } catch { toast.error('Status update failed'); }
  };

  const handleExportAll = () => exportLeadsToCSV(displayed);
  const handleExportSelected = () => exportLeadsToCSV(leads.filter(l => selectedIds.has(l.id)));

  const handleDelete = async (id) => {
    try {
      await deleteLead(id);
      toast.success('Lead deleted');
      setSelectedLead(null);
      loadData();
    } catch { toast.error('Delete failed'); }
  };

  const handleEdit = (lead) => {
    setSelectedLead(null);
    setEditLead(lead);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditLead(null);
    loadData();
  };

  const handleGenerated = () => loadData();

  // ─── Stat card ─────────────────────────────────────────────────────────────

  const StatCard = ({ label, value, color, icon: Icon }) => (
    <div style={{
      padding: '1rem 1.25rem',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{value ?? 0}</p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  );

  // ─── Kanban column ─────────────────────────────────────────────────────────

  const KanbanCol = ({ col }) => {
    const colLeads = sortLeads(leads.filter(l => l.status === col.key), sort);
    return (
      <div style={{ minWidth: 260, flex: '0 0 260px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{col.label}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '0.1rem 0.5rem' }}>{colLeads.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {colLeads.length === 0
            ? <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.08)' }}>No leads</div>
            : colLeads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onSelect={setSelectedLead}
                isSelected={selectedIds.has(lead.id)}
                onToggleSelect={toggleSelect}
                showCheckbox
              />
            ))
          }
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-container">
      <Toaster position="top-right" />
      <div className="container" style={{ paddingTop: '7rem', paddingBottom: '4rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Lead <span className="gradient-text">Pipeline</span></h1>
            <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Manage, qualify and convert your leads
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={handleExportAll} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={15} /> Export CSV
            </button>
            <button className="btn btn-outline" onClick={() => setShowGenerator(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={15} /> Generate Leads
            </button>
            <button className="btn btn-primary" onClick={() => { setEditLead(null); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={15} /> Add Lead
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          <StatCard label="Total Leads" value={stats.total} color="#9333EA" icon={Users} />
          <StatCard label="New" value={stats.new} color="#10B981" icon={Star} />
          <StatCard label="Interested" value={stats.interested} color="#8B5CF6" icon={Target} />
          <StatCard label="Converted" value={stats.converted} color="#22C55E" icon={TrendingUp} />
        </div>

        {/* Bulk actions bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                padding: '0.75rem 1.25rem',
                background: 'rgba(147,51,234,0.1)',
                border: '1px solid rgba(147,51,234,0.3)',
                borderRadius: '10px',
                marginBottom: '1.25rem',
              }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedIds.size} selected</span>
              <button className="btn btn-outline btn-sm" onClick={() => handleBulkStatus('contacted')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                <UserCheck size={13} /> Mark Contacted
              </button>
              <button className="btn btn-outline btn-sm" onClick={handleExportSelected} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                <Download size={13} /> Export Selected
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', marginLeft: 'auto' }}>
                <Trash2 size={13} /> Delete Selected
              </button>
              <button onClick={clearSelection} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Clear
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', flex: 1 }}>
            {STATUS_FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '0.3rem 0.85rem',
                  borderRadius: 99,
                  border: `1px solid ${statusFilter === tab.key ? (tab.color || '#9333EA') : 'rgba(255,255,255,0.1)'}`,
                  background: statusFilter === tab.key ? `${tab.color || '#9333EA'}20` : 'transparent',
                  color: statusFilter === tab.key ? (tab.color || '#9333EA') : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: statusFilter === tab.key ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ position: 'relative' }}>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{
                padding: '0.4rem 2rem 0.4rem 0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
                fontSize: '0.82rem',
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
            {[{ v: 'list', Icon: LayoutGrid }, { v: 'kanban', Icon: Columns }].map(({ v, Icon }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '0.4rem 0.7rem',
                  background: view === v ? 'rgba(147,51,234,0.3)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: view === v ? '#A855F7' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={loadData} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading leads...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <Users size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
            <p>No leads yet. Generate some or add one manually.</p>
          </div>
        ) : view === 'list' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {displayed.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onSelect={setSelectedLead}
                isSelected={selectedIds.has(lead.id)}
                onToggleSelect={toggleSelect}
                showCheckbox
              />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
            {STATUS_COLS.map(col => <KanbanCol key={col.key} col={col} />)}
          </div>
        )}

      </div>

      {/* Modals */}
      <LeadDetailModal
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <LeadFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditLead(null); }}
        onSaved={handleSaved}
        editLead={editLead}
      />
      <LeadGeneratorModal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onGenerated={handleGenerated}
      />
    </motion.div>
  );
}
