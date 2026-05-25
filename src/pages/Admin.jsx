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
  ShieldAlert,
  Mail,
  Receipt,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import WhatsAppInbox from '../components/WhatsAppInbox';
import { auth, db } from '../firebase/config';
import { signInAdmin, signOutAdmin } from '../firebase/auth';
import { doc, getDoc, deleteDoc, collection } from 'firebase/firestore';
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
import { getAllPriceComparisons, getPriceComparisonStats, deletePriceComparison } from '../services/priceComparisonService';
import { getPendingPaymentRequests, approvePaymentRequest, rejectPaymentRequest } from '../services/paymentService';
import { getAllStrategies, getStrategyStats } from '../services/strategyService';

const deleteStrategy = (id) => deleteDoc(doc(db, 'strategies', id));
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('leads');
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
  const [payments, setPayments] = useState([]);
  const [approvedCodes, setApprovedCodes] = useState({});

  const checkAdminRole = async (user) => {
    try {
      // Primary check: admins collection
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (adminDoc.exists()) {
        setUserRole('admin');
        return true;
      }
      // Fallback: users collection role field
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
      const paymentsData = await getPendingPaymentRequests();
      setPayments(paymentsData);
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
            You may be signed in with the wrong account. Sign out and try again with your admin account.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn btn-primary"
              onClick={async () => { await signOutAdmin(); setUserRole(null); setUser(null); }}
              style={{ padding: '0.75rem 2rem' }}
            >
              Sign Out &amp; Try Again
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate('/')}
              style={{ padding: '0.75rem 2rem' }}
            >
              Return to Home
            </button>
          </div>
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
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <a
              href="https://drift-studio-finance.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', borderColor: '#7C3AED', color: '#a78bfa' }}
            >
              <Receipt size={18} />
              Finance
              <ExternalLink size={14} />
            </a>
            <button className="btn btn-outline" onClick={handleLogout}>
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
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
          <TabButton
            active={activeTab === 'whatsapp'}
            onClick={() => setActiveTab('whatsapp')}
            icon={<MessageCircle size={18} />}
            label="WhatsApp"
          />
          <TabButton
            active={activeTab === 'payments'}
            onClick={() => setActiveTab('payments')}
            icon={<Receipt size={18} />}
            label={`Payments${payments.length ? ` (${payments.length})` : ''}`}
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
        {activeTab === 'whatsapp' && (
          <WhatsAppInbox />
        )}
        {activeTab === 'payments' && (
          <div>
            <h2 style={{ marginBottom: '1.5rem' }}>Pending Payment Requests</h2>
            {payments.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)' }}>No pending payment requests.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      {['Name', 'Email', 'Reference', 'Business', 'Submitted', 'Action'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>{p.clientName || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{p.clientEmail || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{p.paymentReference || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{p.businessType || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{p.createdAt?.toDate?.().toLocaleDateString('en-ZA') || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {approvedCodes[p.id] ? (
                            <span style={{ fontWeight: 'bold', color: '#22c55e', letterSpacing: '0.1em' }}>
                              Code: {approvedCodes[p.id]}
                            </span>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.4rem 0.9rem' }}
                                onClick={async () => {
                                  const code = await approvePaymentRequest(p.id, p.clientEmail);
                                  setApprovedCodes(prev => ({ ...prev, [p.id]: code }));
                                  setPayments(prev => prev.filter(r => r.id !== p.id));
                                  toast.success(`Approved — code: ${code}`);
                                }}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-outline"
                                style={{ padding: '0.4rem 0.9rem' }}
                                onClick={async () => {
                                  await rejectPaymentRequest(p.id);
                                  setPayments(prev => prev.filter(r => r.id !== p.id));
                                  toast.success('Request rejected.');
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

// ==================== TESTIMONIALS MANAGER ====================

function TestimonialsManager({ testimonials, onLoad }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', content: '', rating: 5 });
  const [showForm, setShowForm] = useState(false);

  const handleSave = async () => {
    try {
      if (editing) {
        await updateTestimonial(editing, form);
        toast.success('Testimonial updated');
      } else {
        await addTestimonial(form);
        toast.success('Testimonial added');
      }
      setShowForm(false); setEditing(null); setForm({ name: '', role: '', content: '', rating: 5 });
      onLoad();
    } catch { toast.error('Failed to save testimonial'); }
  };

  const handleEdit = (t) => { setEditing(t.id); setForm({ name: t.name, role: t.role, content: t.content, rating: t.rating }); setShowForm(true); };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await deleteTestimonial(id); toast.success('Deleted'); onLoad(); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.8rem' }}>Testimonials ({testimonials.length})</h2>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', role: '', content: '', rating: 5 }); }}><Plus size={18} /> Add</button>
      </div>
      {showForm && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          {['name', 'role', 'content'].map(f => (
            <div key={f} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'capitalize' }}>{f}</label>
              {f === 'content' ? <textarea rows={3} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontFamily: 'inherit' }} /> : <input value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />}
            </div>
          ))}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Rating (1-5)</label>
            <input type="number" min={1} max={5} value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} style={{ width: '100px', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> Save</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}><X size={16} /> Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {testimonials.map(t => (
          <div key={t.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontWeight: 600 }}>{t.name} — <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{t.role}</span></p>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{t.content}</p>
              <p style={{ color: 'var(--accent-color)', marginTop: '0.25rem' }}>{'★'.repeat(t.rating || 5)}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => handleEdit(t)}><Edit size={16} /></button>
              <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'red' }} onClick={() => handleDelete(t.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {testimonials.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>No testimonials yet.</p>}
      </div>
    </div>
  );
}

// ==================== BADGES MANAGER ====================

function BadgesManager({ badges, onLoad }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async () => {
    try { await addTrustBadge(form); toast.success('Badge added'); setShowForm(false); setForm({ name: '', description: '' }); onLoad(); }
    catch { toast.error('Failed to add badge'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.8rem' }}>Trust Badges ({badges.length})</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={18} /> Add</button>
      </div>
      {showForm && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          {['name', 'description'].map(f => (
            <div key={f} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'capitalize' }}>{f}</label>
              <input value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={handleAdd}><Save size={16} /> Save</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}><X size={16} /> Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {badges.map(b => (
          <div key={b.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600 }}>{b.name}</p>
              {b.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{b.description}</p>}
            </div>
            <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'red' }} onClick={async () => { await deleteTrustBadge(b.id); toast.success('Deleted'); onLoad(); }}><Trash2 size={16} /></button>
          </div>
        ))}
        {badges.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>No badges yet.</p>}
      </div>
    </div>
  );
}

// ==================== STATS MANAGER ====================

function StatsManager({ stats, onLoad }) {
  const [form, setForm] = useState(stats || {});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await setStats(form); toast.success('Stats saved'); onLoad(); }
    catch { toast.error('Failed to save stats'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Site Stats</h2>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {Object.keys(form).length === 0 && <p style={{ color: 'var(--text-muted)' }}>No stats configured yet. Add key-value pairs below.</p>}
        {Object.entries(form).map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            <input value={k} readOnly style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-muted)' }} />
            <input value={v} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
            <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'red' }} onClick={() => { const n = { ...form }; delete n[k]; setForm(n); }}><Trash2 size={16} /></button>
          </div>
        ))}
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save Stats'}</button>
      </div>
    </div>
  );
}

// ==================== NOTIFICATIONS MANAGER ====================

function NotificationsManager({ notifications, onLoad }) {
  const [form, setForm] = useState({ title: '', message: '' });
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async () => {
    try { await addSocialProofNotification(form); toast.success('Notification added'); setShowForm(false); setForm({ title: '', message: '' }); onLoad(); }
    catch { toast.error('Failed to add notification'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.8rem' }}>Social Proof Notifications ({notifications.length})</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={18} /> Add</button>
      </div>
      {showForm && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          {['title', 'message'].map(f => (
            <div key={f} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'capitalize' }}>{f}</label>
              <input value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={handleAdd}><Save size={16} /> Save</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}><X size={16} /> Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {notifications.map(n => (
          <div key={n.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600 }}>{n.title}</p>
              {n.message && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{n.message}</p>}
            </div>
            <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'red' }} onClick={async () => { await deleteSocialProofNotification(n.id); toast.success('Deleted'); onLoad(); }}><Trash2 size={16} /></button>
          </div>
        ))}
        {notifications.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>No notifications yet.</p>}
      </div>
    </div>
  );
}

// ==================== LEADS MANAGER ====================

const GENERATE_EMAIL_URL = 'https://us-central1-freeflow-media.cloudfunctions.net/generateColdOutreachEmail';

function LeadsManager({ leads, onLoad }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [emailModal, setEmailModal] = useState(null); // { lead, generatedEmail, loading }

  const handleGenerateEmail = async (lead) => {
    setEmailModal({ lead, generatedEmail: '', loading: true });
    try {
      const res = await fetch(GENERATE_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: lead.business_name,
          industry: lead.industry,
          location: lead.location,
          website: lead.website,
          description: lead.description,
        }),
      });
      const data = await res.json();
      setEmailModal({ lead, generatedEmail: data.email || '', loading: false });
    } catch {
      toast.error('Failed to generate email');
      setEmailModal(null);
    }
  };

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
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700 }}>
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
                  <button className="btn btn-primary" style={{ padding: '0.5rem', fontSize: '0.75rem', gap: '0.25rem' }} onClick={() => handleGenerateEmail(lead)} title="Generate outreach email">
                    <Mail size={14} /> Email
                  </button>
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

      {/* Email Generation Modal */}
      {emailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', padding: '2rem', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem' }}>Outreach Email — {emailModal.lead.business_name}</h3>
              <button onClick={() => setEmailModal(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {emailModal.loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Generating email with AI...</div>
            ) : (
              <>
                <textarea
                  value={emailModal.generatedEmail}
                  onChange={e => setEmailModal({ ...emailModal, generatedEmail: e.target.value })}
                  rows={16}
                  style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { navigator.clipboard.writeText(emailModal.generatedEmail); toast.success('Copied to clipboard!'); }}>
                    Copy Email
                  </button>
                  {emailModal.lead.email && (
                    <a href={`mailto:${emailModal.lead.email}?subject=Partnership Opportunity — Drift Studio&body=${encodeURIComponent(emailModal.generatedEmail)}`} className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }}>
                      Open in Mail App
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
