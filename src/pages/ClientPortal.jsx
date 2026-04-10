import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, BarChart3, FileText, TrendingUp, Mail, Eye, LogOut } from 'lucide-react';
import { signIn, logOut, onAuthChange } from '../firebase/auth';
import { getClient, subscribeToCampaigns, getClientReports } from '../firebase/firestore';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

const ClientPortal = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientData, setClientData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch client data from Firestore
        getClient(firebaseUser.uid).then((data) => {
          if (data) {
            setClientData(data);
          }
        }).catch(console.error);

        // Subscribe to campaigns
        const unsubCampaigns = subscribeToCampaigns(firebaseUser.uid, (campaignsData) => {
          setCampaigns(campaignsData);
        });

        return () => unsubCampaigns();
      } else {
        setUser(null);
        setClientData(null);
        setCampaigns([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signIn(email, password);
      toast.success('Welcome back!');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Try again later.');
      } else {
        setError('Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      toast.success('Signed out successfully');
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="page-container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}
      >
        <div className="container" style={{ maxWidth: '450px' }}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-panel"
            style={{ padding: '3rem' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem'
              }}>
                <Lock size={28} color="white" />
              </div>
              <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Client <span className="gradient-text">Portal</span></h1>
              <p style={{ color: 'var(--text-muted)' }}>Access your campaign dashboard and reports</p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'white',
                      outline: 'none',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'white',
                      outline: 'none',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              {error && (
                <p style={{ color: '#ef4444', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Don't have access? <a href="#" style={{ color: 'var(--accent-color)' }}>Contact your account manager</a>
            </p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Dashboard View
  const displayName = user?.displayName || clientData?.businessName || user?.email?.split('@')[0];
  
  const stats = clientData?.campaignStats || {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalLeads: campaigns.reduce((sum, c) => sum + (c.leads || 0), 0),
    conversionRate: '0%',
    roi: '0%'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
      style={{ paddingTop: '8rem', paddingBottom: '4rem' }}
    >
      <Toaster position="top-right" />
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>Welcome back, <span className="gradient-text">{displayName}</span></h1>
            <p style={{ color: 'var(--text-muted)' }}>Here's your campaign overview</p>
          </div>
          <button
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {[
            { icon: BarChart3, label: 'Total Campaigns', value: stats.totalCampaigns, color: '#9333EA' },
            { icon: TrendingUp, label: 'Active Campaigns', value: stats.activeCampaigns, color: '#A855F7' },
            { icon: User, label: 'Total Leads', value: stats.totalLeads.toLocaleString(), color: '#C084FC' },
            { icon: FileText, label: 'Conversion Rate', value: stats.conversionRate, color: '#9333EA' },
            { icon: TrendingUp, label: 'ROI', value: stats.roi, color: '#A855F7' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel"
              style={{ padding: '1.5rem' }}
            >
              <stat.icon size={32} color={stat.color} style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{stat.value}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Campaigns List */}
        {campaigns.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="glass-panel"
            style={{ padding: '2rem', marginBottom: '2rem' }}
          >
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={24} color="var(--accent-color)" />
              Active Campaigns
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{campaign.name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {campaign.type} • {campaign.leads || 0} leads
                    </p>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '99px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: campaign.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: campaign.status === 'active' ? '#22c55e' : 'var(--text-muted)'
                  }}>
                    {campaign.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {campaigns.length === 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="glass-panel"
            style={{ padding: '3rem', textAlign: 'center' }}
          >
            <Mail size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No campaigns yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Your campaigns will appear here once they're set up.
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ClientPortal;
