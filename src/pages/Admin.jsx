import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Building2, 
  BarChart3, 
  Bell, 
  Users,
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X,
  Upload,
  ToggleLeft,
  ToggleRight,
  LogOut,
  Download
} from 'lucide-react';
import { auth } from '../firebase/config';
import { signInAdmin, signOutAdmin } from '../firebase/auth';
import {
  getAllTestimonials,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getAllTrustBadges,
  addTrustBadge,
  updateTrustBadge,
  deleteTrustBadge,
  getStats,
  setStats,
  getAllSocialProofNotifications,
  addSocialProofNotification,
  updateSocialProofNotification,
  deleteSocialProofNotification,
  uploadImage,
  getAllLeads,
  deleteLead,
  updateLead,
  exportLeadsToCSV
} from '../services/contentService';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('testimonials');
  const [loading, setLoading] = useState(true);

  // Data states
  const [testimonials, setTestimonials] = useState([]);
  const [trustBadges, setTrustBadges] = useState([]);
  const [stats, setStatsData] = useState({});
  const [socialProof, setSocialProof] = useState([]);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        await loadAllData();
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadAllData = async () => {
    try {
      const [testimonialsData, badgesData, statsData, socialProofData, leadsData] = await Promise.all([
        getAllTestimonials(false),
        getAllTrustBadges(false),
        getStats(),
        getAllSocialProofNotifications(false),
        getAllLeads({})
      ]);
      setTestimonials(testimonialsData);
      setTrustBadges(badgesData);
      setStatsData(statsData || {});
      setSocialProof(socialProofData);
      setLeads(leadsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load content data');
    }
  };

  const handleLogin = async () => {
    const email = prompt('Enter admin email:');
    const password = prompt('Enter password:');
    if (!email || !password) return;
    
    try {
      await signInAdmin(email, password);
      toast.success('Logged in successfully');
    } catch (error) {
      toast.error('Login failed: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await signOutAdmin();
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <div className="loader-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', padding: '2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: '3rem', maxWidth: '500px', width: '100%' }}
        >
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>Admin Login</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>
            Sign in to manage your website content
          </p>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem' }}
            onClick={handleLogin}
          >
            Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px', paddingBottom: '4rem', background: 'var(--bg-color)' }}>
      <Toaster position="top-right" />
      
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Content Manager</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage your website content</p>
          </div>
          <button className="btn btn-outline" onClick={handleLogout}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <TabButton 
            active={activeTab === 'testimonials'} 
            onClick={() => setActiveTab('testimonials')}
            icon={<MessageSquare size={18} />}
            label="Testimonials"
          />
          <TabButton 
            active={activeTab === 'badges'} 
            onClick={() => setActiveTab('badges')}
            icon={<Building2 size={18} />}
            label="Trust Badges"
          />
          <TabButton 
            active={activeTab === 'leads'} 
            onClick={() => setActiveTab('leads')}
            icon={<Users size={18} />}
            label={`Leads (${leads.length})`}
          />
          <TabButton 
            active={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')}
            icon={<BarChart3 size={18} />}
            label="Stats"
          />
          <TabButton 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')}
            icon={<Bell size={18} />}
            label="Notifications"
          />
        </div>

        {/* Content */}
        {activeTab === 'testimonials' && (
          <TestimonialsManager testimonials={testimonials} onLoad={loadAllData} />
        )}
        {activeTab === 'badges' && (
          <BadgesManager badges={trustBadges} onLoad={loadAllData} />
        )}
        {activeTab === 'leads' && (
          <LeadsManager leads={leads} onLoad={loadAllData} />
        )}
        {activeTab === 'stats' && (
          <StatsManager stats={stats} onLoad={loadAllData} />
        )}
        {activeTab === 'notifications' && (
          <NotificationsManager notifications={socialProof} onLoad={loadAllData} />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.75rem 1.5rem',
        background: active ? 'linear-gradient(135deg, var(--primary-color), var(--accent-color))' : 'rgba(255, 255, 255, 0.05)',
        border: active ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s ease'
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// (Keep all the existing manager components: TestimonialsManager, BadgesManager, StatsManager, NotificationsManager)
// ... [Previous manager components remain unchanged] ...

// ==================== LEADS MANAGER ====================

function LeadsManager({ leads, onLoad }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return;
    try {
      await deleteLead(id);
      toast.success('Lead deleted');
      onLoad();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) {
      toast.error('No leads to export');
      return;
    }
    exportLeadsToCSV(leads);
    toast.success('Leads exported to CSV');
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateLead(id, { status: newStatus });
      toast.success('Lead status updated');
      onLoad();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = search === '' || 
      lead.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.industry?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === '' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    new: '#3b82f6',
    contacted: '#f59e0b',
    interested: '#10b981',
    not_interested: '#ef4444',
    follow_up: '#8b5cf6',
    converted: '#22c55e'
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.8rem' }}>Leads ({leads.length})</h2>
        <button className="btn btn-primary" onClick={handleExportCSV}>
          <Download size={18} />
          Export CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or industry..."
          style={{ width: '100%', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'white' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'white' }}
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="interested">Interested</option>
          <option value="not_interested">Not Interested</option>
          <option value="follow_up">Follow Up</option>
          <option value="converted">Converted</option>
        </select>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => (
            <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      {(lead.business_name || '?').charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{lead.business_name || 'Unknown'}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        {lead.industry || 'No industry'} • {lead.location || 'No location'}
                      </p>
                    </div>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '20px', 
                      background: `${statusColors[lead.status] || '#6b7280'}20`,
                      color: statusColors[lead.status] || '#6b7280',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {lead.status?.replace('_', ' ') || 'new'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                    {lead.email && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>📧 {lead.email}</p>}
                    {lead.phone && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>📞 {lead.phone}</p>}
                    {lead.website && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>🌐 {lead.website}</p>}
                    {lead.source && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Source: {lead.source}</p>}
                  </div>
                  {lead.notes && <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginTop: '0.75rem', fontStyle: 'italic' }}>{lead.notes}</p>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                  <select
                    value={lead.status || 'new'}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="interested">Interested</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="converted">Converted</option>
                  </select>
                  <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'red' }} onClick={() => handleDelete(lead.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem' }}>{leads.length === 0 ? 'No leads yet. Add leads from the Lead Generator page.' : 'No leads match your filters.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
