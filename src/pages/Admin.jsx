import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  Download,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { auth, db } from '../firebase/config';
import { signInAdmin, signOutAdmin } from '../firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
import { getAllPriceComparisons, getPriceComparisonStats } from '../services/priceComparisonService';
import { getAllStrategies, getStrategyStats } from '../services/strategyService';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('testimonials');
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const navigate = useNavigate();

  // Data states
  const [testimonials, setTestimonials] = useState([]);
  const [trustBadges, setTrustBadges] = useState([]);
  const [stats, setStatsData] = useState({});
  const [socialProof, setSocialProof] = useState([]);
  const [leads, setLeads] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [priceComparisons, setPriceComparisons] = useState([]);

  const checkAdminRole = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data()?.role;
        setUserRole(role);
        return role === 'admin';
      }
      setUserRole(null);
      return false;
    } catch (error) {
      console.error('Error checking admin role:', error);
      setUserRole(null);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const isAdmin = await checkAdminRole(user);
        if (isAdmin) {
          setUser(user);
          await loadAllData();
        } else {
          setUser(null);
          setUserRole('unauthorized');
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadAllData = async () => {
    try {
      const [testimonialsData, badgesData, statsData, socialProofData, leadsData, strategiesData, priceComparisonsData] = await Promise.all([
        getAllTestimonials(false),
        getAllTrustBadges(false),
        getStats(),
        getAllSocialProofNotifications(false),
        getAllLeads({}),
        getAllStrategies({}),
        getAllPriceComparisons({})
      ]);
      setTestimonials(testimonialsData);
      setTrustBadges(badgesData);
      setStatsData(statsData || {});
      setSocialProof(socialProofData);
      setLeads(leadsData);
      setStrategies(strategiesData);
      setPriceComparisons(priceComparisonsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load content data');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      setLoginError('Please enter email and password');
      return;
    }
    setLoginError('');
    setLoginLoading(true);

    try {
      await signInAdmin(loginData.email, loginData.password);
      const currentUser = auth.currentUser;
      const isAdmin = await checkAdminRole(currentUser);
      
      if (isAdmin) {
        toast.success('Logged in successfully');
        setShowLoginModal(false);
        setLoginData({ email: '', password: '' });
      } else {
        await signOutAdmin();
        setUserRole('unauthorized');
        setLoginError('Access denied. Admin privileges required.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Login failed. Check your credentials.');
    } finally {
      setLoginLoading(false);
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

  if (userRole === 'unauthorized') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', padding: '2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: '3rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginBottom: '1.5rem' 
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={40} color="white" />
            </div>
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#ef4444' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.6' }}>
            This area contains confidential information and is restricted to authorized personnel only.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            If you believe this is an error, please contact the system administrator.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/')}
            style={{ padding: '0.75rem 2rem' }}
          >
            Return to Home
          </button>
        </motion.div>
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
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem', cursor: 'pointer' }}
            onClick={() => setShowLoginModal(true)}
          >
            <Lock size={20} style={{ marginRight: '0.5rem' }} />
            Sign In
          </button>
        </motion.div>

        <AnimatePresence>
          {showLoginModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
              }}
              onClick={() => setShowLoginModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-panel"
                style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem' }}>Sign In</h3>
                  <button
                    onClick={() => setShowLoginModal(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                  >
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email</label>
                    <input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                      placeholder="admin@example.com"
                    />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Password</label>
                    <input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '1rem'
                      }}
                      placeholder="••••••••"
                    />
                  </div>
                  {loginError && (
                    <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      {loginError}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '1rem', cursor: loginLoading ? 'not-allowed' : 'pointer' }}
                    disabled={loginLoading}
                  >
                    {loginLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
            active={activeTab === 'strategies'}
            onClick={() => setActiveTab('strategies')}
            icon={<BarChart3 size={18} />}
            label={`Strategies (${strategies.length})`}
          />
          <TabButton
            active={activeTab === 'priceComparisons'}
            onClick={() => setActiveTab('priceComparisons')}
            icon={<BarChart3 size={18} />}
            label={`Price Comparisons (${priceComparisons.length})`}
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
        {activeTab === 'strategies' && (
          <StrategiesManager strategies={strategies} onLoad={loadAllData} />
        )}
        {activeTab === 'priceComparisons' && (
          <PriceComparisonsManager comparisons={priceComparisons} onLoad={loadAllData} />
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

// ==================== STRATEGIES MANAGER ====================

function StrategiesManager({ strategies, onLoad }) {
  const [search, setSearch] = useState('');

  const handleDelete = async (id) => {
    if (!confirm('Delete this strategy?')) return;
    try {
      await deleteStrategy(id);
      toast.success('Strategy deleted');
      onLoad();
    } catch (error) {
      toast.error('Failed to delete strategy');
    }
  };

  const filteredStrategies = strategies.filter((s) => {
    return search === '' ||
      s.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      s.targetAudience?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.8rem' }}>Strategies ({strategies.length})</h2>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by business name or audience..."
        style={{ width: '100%', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'white', marginBottom: '2rem' }}
      />

      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredStrategies.length > 0 ? (
          filteredStrategies.map((strategy) => (
            <motion.div key={strategy.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{strategy.businessName || 'Unknown Business'}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    Target: {strategy.targetAudience || 'N/A'} • Location: {strategy.businessCountry || 'Global'}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Status: {strategy.status} • Payment: {strategy.paymentStatus} • 
                    Generated: {strategy.createdAt ? new Date(strategy.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                  </p>
                  {strategy.userEmail && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>User: {strategy.userEmail}</p>}
                </div>
                <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'red' }} onClick={() => handleDelete(strategy.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem' }}>No strategies generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== PRICE COMPARISONS MANAGER ====================

function PriceComparisonsManager({ comparisons, onLoad }) {
  const [search, setSearch] = useState('');

  const handleDelete = async (id) => {
    if (!confirm('Delete this price comparison?')) return;
    try {
      await deletePriceComparison(id);
      toast.success('Price comparison deleted');
      onLoad();
    } catch (error) {
      toast.error('Failed to delete price comparison');
    }
  };

  const filteredComparisons = comparisons.filter((c) => {
    return search === '' ||
      c.businessType?.toLowerCase().includes(search.toLowerCase()) ||
      c.industry?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.8rem' }}>Price Comparisons ({comparisons.length})</h2>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by business type or industry..."
        style={{ width: '100%', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'white', marginBottom: '2rem' }}
      />

      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredComparisons.length > 0 ? (
          filteredComparisons.map((comparison) => (
            <motion.div key={comparison.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{comparison.businessType || 'Unknown Business'}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    Industry: {comparison.industry || 'N/A'} • Location: {comparison.location || 'Global'}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Status: {comparison.status} • 
                    Generated: {comparison.generatedAt ? new Date(comparison.generatedAt.toDate()).toLocaleDateString() : 'N/A'}
                  </p>
                  {comparison.userEmail && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>User: {comparison.userEmail}</p>}
                </div>
                <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'red' }} onClick={() => handleDelete(comparison.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem' }}>No price comparisons generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
