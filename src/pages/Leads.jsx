import { useState, useEffect, useCallback } from 'react';

import { COUNTRIES, SA_PROVINCES } from '../utils/countryCodes';

const SEL = {
  padding: '0.5rem 0.75rem', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
  color: 'inherit', fontSize: '0.85rem', cursor: 'pointer', flex: 1, minWidth: 120,
};
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Sparkles, Download, LayoutGrid, Columns, Trash2,
  UserCheck, RefreshCw, TrendingUp, Users, Target, Star,
  ChevronDown, Mail, BellRing, Ban, Settings, Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import LeadCard from '../components/LeadCard';
import LeadDetailModal from '../components/LeadDetailModal';
import LeadFormModal from '../components/LeadFormModal';
import LeadGeneratorModal from '../components/LeadGeneratorModal';
import {
  fetchLeads, deleteLead,
  bulkDeleteLeads, bulkUpdateStatus, getDashboardStats, exportLeadsToCSV,
  getSearchTargets, saveSearchTarget, toggleSearchTarget, deleteSearchTarget,
} from '../services/leadApi';
import {
  markLeadReplied, markLeadQualified, stopOutreach,
  SALES_AGENT_STATUS_LABELS, SALES_AGENT_STATUS_COLORS,
} from '../services/salesAgentService';

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
  const [showTargets, setShowTargets] = useState(false);
  const [targets, setTargets] = useState([]);
  const [newTarget, setNewTarget] = useState({ query: '', country: 'South Africa', province: '', city: '', maxResults: 20 });
  const [runningNow, setRunningNow] = useState(false);

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

  const loadTargets = useCallback(async () => {
    try {
      const data = await getSearchTargets();
      setTargets(data);
    } catch {
      // non-critical — targets panel may be empty
    }
  }, []);

  useEffect(() => { loadTargets(); }, [loadTargets]);

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

  const handleMarkReplied = async (leadId) => {
    try {
      await markLeadReplied(leadId);
      toast.success('Lead marked as replied — Discord alert sent');
      loadData();
    } catch { toast.error('Failed to mark as replied'); }
  };

  const handleMarkQualified = async (leadId) => {
    try {
      await markLeadQualified(leadId);
      toast.success('Lead marked as qualified — Discord alert sent');
      loadData();
    } catch { toast.error('Failed to mark as qualified'); }
  };

  const handleStopOutreach = async (leadId) => {
    if (!window.confirm('Stop all outreach to this lead? This cannot be undone.')) return;
    try {
      await stopOutreach(leadId);
      toast.success('Outreach stopped');
      loadData();
    } catch { toast.error('Failed to stop outreach'); }
  };

  const handleAddTarget = async () => {
    if (!newTarget.query.trim()) {
      toast.error('Search query is required');
      return;
    }
    const location = newTarget.city
      ? `${newTarget.city}, ${newTarget.province || newTarget.country}`
      : newTarget.province
      ? `${newTarget.province}, ${newTarget.country}`
      : newTarget.country;
    try {
      await saveSearchTarget({ ...newTarget, location });
      setNewTarget({ query: '', country: 'South Africa', province: '', city: '', maxResults: 20 });
      toast.success('Target added');
      loadTargets();
    } catch { toast.error('Failed to add target'); }
  };

  const handleToggleTarget = async (id, active) => {
    try {
      await toggleSearchTarget(id, active);
      loadTargets();
    } catch { toast.error('Failed to update target'); }
  };

  const handleDeleteTarget = async (id) => {
    try {
      await deleteSearchTarget(id);
      toast.success('Target removed');
      loadTargets();
    } catch { toast.error('Failed to delete target'); }
  };

  const handleRunNow = async () => {
    const url = import.meta.env.VITE_TRIGGER_AUTO_GENERATE_URL;
    if (!url) { toast.error('Auto-generate URL not configured'); return; }
    setRunningNow(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const currentUser = getAuth().currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : null;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });
      const data = await res.json();
      toast.success(`Done — ${data.newCount} new leads saved`);
      loadData();
    } catch { toast.error('Run failed — check console'); }
    finally { setRunningNow(false); }
  };

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

  const OutreachStatusBadge = ({ status }) => {
    if (!status) return null;
    const color = SALES_AGENT_STATUS_COLORS[status] || '#6B7280';
    const label = SALES_AGENT_STATUS_LABELS[status] || status;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.2rem 0.6rem', borderRadius: 99,
        background: `${color}20`, border: `1px solid ${color}40`,
        color, fontSize: '0.7rem', fontWeight: 600,
      }}>
        <Mail size={10} />
        {label}
      </span>
    );
  };

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
      <div className="container" style={{ paddingTop: '9.5rem', paddingBottom: '4rem' }}>

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
            <button
              className="btn btn-outline"
              onClick={() => setShowTargets(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: showTargets ? '#A78BFA' : undefined }}
            >
              <Settings size={15} /> Auto-Generate
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

        {/* Search Targets Panel */}
        {showTargets && (
          <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Auto-Generate Targets</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Runs daily at 8am SAST — adds new leads automatically</p>
              </div>
              <button
                onClick={handleRunNow}
                disabled={runningNow}
                style={{ padding: '0.4rem 0.9rem', borderRadius: 8, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA', fontSize: '0.8rem', fontWeight: 600, cursor: runningNow ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: runningNow ? 0.6 : 1 }}
              >
                <Play size={13} /> {runningNow ? 'Running...' : 'Run Now'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {targets.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', margin: 0 }}>No targets yet. Add one below.</p>
              ) : targets.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.query}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}> — {t.location}</span>
                    {t.industry && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}> · {t.industry}</span>}
                    {t.leadsFoundLastRun != null && (
                      <span style={{ color: '#10B981', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Last run: {t.leadsFoundLastRun} leads</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleTarget(t.id, !t.active)}
                    style={{ background: 'none', border: `1px solid ${t.active ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, padding: '0.25rem 0.6rem', cursor: 'pointer', color: t.active ? '#10B981' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    {t.active ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => handleDeleteTarget(t.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search query (e.g. hair salons)"
                  value={newTarget.query}
                  onChange={e => setNewTarget(p => ({ ...p, query: e.target.value }))}
                  style={{ flex: 2, minWidth: 160, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: '0.85rem' }}
                />
                <select
                  value={newTarget.country}
                  onChange={e => setNewTarget(p => ({ ...p, country: e.target.value, province: '' }))}
                  style={SEL}
                >
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {newTarget.country === 'South Africa' ? (
                  <select
                    value={newTarget.province}
                    onChange={e => setNewTarget(p => ({ ...p, province: e.target.value }))}
                    style={SEL}
                  >
                    <option value="">All provinces</option>
                    {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : null}
                <input
                  type="text"
                  placeholder={newTarget.country === 'South Africa' ? 'City (optional)' : 'City / Region'}
                  value={newTarget.city}
                  onChange={e => setNewTarget(p => ({ ...p, city: e.target.value }))}
                  style={{ flex: 2, minWidth: 120, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: '0.85rem' }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={newTarget.maxResults}
                  onChange={e => setNewTarget(p => ({ ...p, maxResults: parseInt(e.target.value) || 20 }))}
                  style={{ width: 72, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: '0.85rem' }}
                />
                <button
                  onClick={handleAddTarget}
                  style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Add Target
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Sales Outreach */}
        {displayed.some(l => l.salesAgent?.status) && (
          <div style={{ marginTop: '3rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                Sales <span className="gradient-text">Outreach</span>
              </h2>
              <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Automated follow-up — leads the sales agent has contacted
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {displayed.filter(l => l.salesAgent?.status).map(lead => {
                const sa = lead.salesAgent;
                const TERMINAL = ['replied', 'qualified', 'not_interested', 'bounced'];
                const canReply = !TERMINAL.includes(sa.status) && !sa.stopRequested;
                const canQualify = sa.status === 'replied';
                const canStop = !sa.stopRequested && !TERMINAL.includes(sa.status) && sa.status !== 'no_response';
                return (
                  <div
                    key={lead.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                      padding: '0.85rem 1.1rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{lead.business_name}</p>
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.email}</p>
                    </div>
                    <OutreachStatusBadge status={sa.status} />
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                      {canReply && (
                        <button
                          onClick={() => handleMarkReplied(lead.id)}
                          style={{
                            padding: '0.35rem 0.75rem', borderRadius: 8,
                            border: '1px solid rgba(245,158,11,0.4)',
                            background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                          }}
                        >
                          <BellRing size={11} /> Mark Replied
                        </button>
                      )}
                      {canQualify && (
                        <button
                          onClick={() => handleMarkQualified(lead.id)}
                          style={{
                            padding: '0.35rem 0.75rem', borderRadius: 8,
                            border: '1px solid rgba(34,197,94,0.4)',
                            background: 'rgba(34,197,94,0.1)', color: '#22C55E',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                          }}
                        >
                          ✓ Qualified
                        </button>
                      )}
                      {canStop && (
                        <button
                          onClick={() => handleStopOutreach(lead.id)}
                          style={{
                            padding: '0.35rem 0.75rem', borderRadius: 8,
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'transparent', color: '#EF4444',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                          }}
                        >
                          <Ban size={11} /> Stop
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
