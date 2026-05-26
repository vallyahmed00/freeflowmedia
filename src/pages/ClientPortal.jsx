import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, BarChart3, FileText, TrendingUp, Mail, Eye, LogOut, Plus, Calendar, Clock, ExternalLink, FolderOpen, Upload, CheckCircle, AlertCircle, Receipt, Bot, Zap } from 'lucide-react';
import { signIn, logOut, onAuthChange, resetPassword } from '../firebase/auth';
import { getClient, subscribeToCampaigns, getClientReports, subscribeToContentCalendars, subscribeToScheduledPosts, subscribeToClientInvoices, updateInvoicePoP } from '../firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

// Status styling maps
const calendarStatusMap = {
  awaiting_approval: { bg: 'rgba(234,179,8,0.15)', color: '#EAB308', label: 'Awaiting Approval' },
  approved: { bg: 'rgba(34,197,94,0.15)', color: '#22C55E', label: 'Approved' },
  scheduled: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', label: 'Scheduled' },
  revision_requested: { bg: 'rgba(249,115,22,0.15)', color: '#F97316', label: 'Revision Requested' }
};

const platformBadge = (p) => {
  const map = {
    Instagram: { bg: 'rgba(225,48,108,0.15)', color: '#E1306C', label: 'IG' },
    Facebook: { bg: 'rgba(24,119,242,0.15)', color: '#1877F2', label: 'FB' },
    TikTok: { bg: 'rgba(255,0,80,0.15)', color: '#FF0050', label: 'TT' },
    LinkedIn: { bg: 'rgba(10,102,194,0.15)', color: '#0A66C2', label: 'LI' },
    'Twitter / X': { bg: 'rgba(255,255,255,0.1)', color: '#fff', label: '𝕏' }
  };
  return map[p] || { bg: 'rgba(255,255,255,0.1)', color: '#fff', label: p?.slice(0, 2) };
};

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const PORTAL_HELP = {
  dashboard: {
    title: 'Reading your dashboard',
    steps: [
      'Active Campaigns shows calendars currently in the scheduled or approved state.',
      'Posts Queued is the number of posts waiting to publish across all your calendars.',
      'Posts Published is the running total of posts that have already gone live.',
      'All counts update in real time as posts publish.',
    ],
  },
  calendars: {
    title: 'Managing your calendars',
    steps: [
      'Awaiting Approval — your calendar is ready to review. Check your email for the review link.',
      'Approved — you\'ve approved it and posts are queuing up to publish.',
      'Scheduled — posts are actively being published on their scheduled dates.',
      'Revision Requested — feedback sent, the AI is regenerating your calendar.',
    ],
  },
  posts: {
    title: 'Upcoming posts',
    steps: [
      'These are the next 5 posts scheduled to publish across all your active calendars.',
      'Each card shows the platform, caption, and exact scheduled time.',
      'Click a card to expand the full caption and hashtags.',
      'Posts publish automatically — no action needed from you.',
    ],
  },
};

const HelpPanel = ({ activeTab }) => {
  const [open, setOpen] = useState(false);
  const tabKey = activeTab === 'campaigns' ? 'dashboard' : activeTab === 'calendars' ? 'calendars' : 'posts';
  const help = PORTAL_HELP[tabKey];

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100 }}>
      {open && (
        <div style={{
          marginBottom: '0.75rem',
          background: 'rgba(15,10,30,0.97)',
          border: '1px solid rgba(147,51,234,0.4)',
          borderRadius: '14px',
          padding: '1.25rem',
          width: '300px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{help.title}</p>
          <ol style={{ margin: 0, padding: '0 0 0 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {help.steps.map((s, i) => (
              <li key={i} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: open ? '#9333EA' : 'rgba(147,51,234,0.2)',
          border: '1px solid rgba(147,51,234,0.5)',
          color: '#fff',
          fontSize: '1.1rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
          marginLeft: 'auto',
        }}
        title="Help"
      >
        ?
      </button>
    </div>
  );
};

// ── Expandable post preview card ─────────────────────────────────────────────
const PostCard = ({ post, caption, pb, statusStyle }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const isLong = caption.length > 120;

  const handleCopy = () => {
    navigator.clipboard.writeText(caption).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt={`Post visual - day ${post.day || ''}`}
          style={{
            width: '100%',
            borderRadius: '8px',
            objectFit: 'cover',
            maxHeight: '220px',
            marginBottom: '0.75rem',
            display: 'block',
          }}
          loading="lazy"
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {/* Platform badge */}
        <span style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, background: pb.bg, color: pb.color, flexShrink: 0, marginTop: '2px' }}>{pb.label}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Caption */}
          <p style={{ fontSize: '0.9rem', lineHeight: '1.55', margin: '0 0 0.25rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {expanded || !isLong ? caption : caption.slice(0, 120) + '…'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>{formatDateTime(post.scheduledTime)}</p>

            {isLong && (
              <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}

            {caption && (
              <button onClick={handleCopy} style={{ background: 'none', border: 'none', color: copied ? '#22C55E' : 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
                {copied ? '✓ Copied' : 'Copy caption'}
              </button>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span style={{ padding: '3px 8px', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 600, background: statusStyle.bg, color: statusStyle.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {post.status}
        </span>
      </div>
    </div>
  );
};

const BOT_LABELS = {
  lead_response:    { name: 'Lead Response Bot',       icon: '🚀' },
  invoice_reminder: { name: 'Invoice Reminder Bot',    icon: '💸' },
  content_calendar: { name: 'Content Calendar Bot',    icon: '📅' },
  followup_nudge:   { name: 'Follow-up Nudge Bot',     icon: '🔔' },
  client_onboarding:{ name: 'Client Onboarding Bot',   icon: '🎉' },
  competitor_tracker:{ name: 'Competitor Tracker Bot', icon: '📊' },
  whatsapp_qualifier:{ name: 'WhatsApp Lead Qualifier',icon: '💬' },
  instant_proposal: { name: 'Instant Proposal Bot',    icon: '📄' },
  trend_alerts:     { name: 'Trend Alert Bot',         icon: '📈' },
  reputation_defender:{ name: 'Reputation Defender',   icon: '⭐' },
  review_request:   { name: 'Review Request Bot',      icon: '🌟' },
  monthly_report:   { name: 'Monthly Report Bot',      icon: '📋' },
  re_engagement:    { name: 'Re-engagement Bot',       icon: '🔄' },
  win_back:         { name: 'Win-Back Bot',            icon: '🏆' },
  upsell:           { name: 'Upsell Bot',              icon: '💡' },
};

const ClientPortal = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [contentCalendars, setContentCalendars] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [invoices, setInvoices] = useState([]);
  const [uploadingPopId, setUploadingPopId] = useState(null);
  const [botReviews, setBotReviews] = useState([]);
  const [botContentBatches, setBotContentBatches] = useState([]);
  const [botDigests, setBotDigests] = useState([]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        getClient(firebaseUser.uid).then((data) => {
          if (data) setClientData(data);
        }).catch(console.error);

        const unsubCampaigns = subscribeToCampaigns(firebaseUser.uid, setCampaigns);
        const unsubCalendars = subscribeToContentCalendars(firebaseUser.uid, setContentCalendars);
        const unsubPosts = subscribeToScheduledPosts(firebaseUser.uid, setScheduledPosts);
        const unsubInvoices = subscribeToClientInvoices(firebaseUser.email, setInvoices);

        const unsubReviews = onSnapshot(
          query(collection(db, 'reviews'), where('clientId', '==', firebaseUser.uid), limit(20)),
          snap => setBotReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        const unsubContent = onSnapshot(
          query(collection(db, `clientContent/${firebaseUser.uid}/weeklyIdeas`), limit(12)),
          snap => setBotContentBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
        const unsubDigests = onSnapshot(
          query(collection(db, `clientIntel/${firebaseUser.uid}/weeklyDigests`), limit(12)),
          snap => setBotDigests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );

        return () => { unsubCampaigns(); unsubCalendars(); unsubPosts(); unsubInvoices(); unsubReviews(); unsubContent(); unsubDigests(); };
      } else {
        setUser(null);
        setClientData(null);
        setCampaigns([]);
        setInvoices([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handlePopUpload = async (invoiceId, file) => {
    if (!file) return;
    setUploadingPopId(invoiceId);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `proofOfPayment/${invoiceId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateInvoicePoP(invoiceId, url);
      toast.success('Proof of payment uploaded — we\'ll verify and confirm shortly.');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploadingPopId(null);
    }
  };

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

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      toast.success('Reset link sent — check your inbox');
      setShowReset(false);
      setResetEmail('');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        toast.error('No account found with that email');
      } else {
        toast.error('Could not send reset email. Try again.');
      }
    } finally {
      setResetLoading(false);
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

  const activityFeed = useMemo(() => {
    const items = [];
    botContentBatches.forEach(b => items.push({
      id: `content-${b.id}`, icon: '📅',
      text: `Content Calendar Bot delivered ${b.ideas?.length || 8} content ideas for the week`,
      time: b.createdAt,
    }));
    botDigests.forEach(d => items.push({
      id: `digest-${d.id}`, icon: '📊',
      text: 'Competitor Tracker Bot delivered your weekly intelligence digest',
      time: d.createdAt,
    }));
    botReviews.filter(r => r.suggestedReply).forEach(r => items.push({
      id: `review-${r.id}`, icon: '⭐',
      text: `Reputation Defender suggested a reply to a ${r.rating}-star ${r.platform || ''} review from ${r.reviewerName || 'a customer'}`,
      time: r.createdAt,
    }));
    invoices.filter(i => (i.reminderCount || 0) > 0).forEach(i => items.push({
      id: `invoice-${i.id}`, icon: '💸',
      text: `Invoice Reminder Bot sent ${i.reminderCount} reminder${i.reminderCount > 1 ? 's' : ''} for ${i.invoiceNumber || 'an invoice'}`,
      time: i.lastReminderAt || i.updatedAt,
    }));
    return items.sort((a, b) => {
      const ta = a.time?.toDate ? a.time.toDate() : new Date(a.time || 0);
      const tb = b.time?.toDate ? b.time.toDate() : new Date(b.time || 0);
      return tb - ta;
    }).slice(0, 12);
  }, [botContentBatches, botDigests, botReviews, invoices]);

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

              <p style={{ textAlign: 'center', marginTop: '1rem', marginBottom: 0 }}>
                <button
                  type="button"
                  onClick={() => setShowReset(!showReset)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Forgot password?
                </button>
              </p>
            </form>

            {showReset && (
              <form onSubmit={handlePasswordReset} style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(147,51,234,0.06)', borderRadius: '10px', border: '1px solid rgba(147,51,234,0.2)' }}>
                <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Enter your email and we'll send a reset link.</p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{ width: '100%', padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '0.75rem' }}
                />
                <button type="submit" disabled={resetLoading} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                  {resetLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}

            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Don't have access? <a href="/onboarding" style={{ color: 'var(--accent-color)' }}>Sign up here</a>
            </p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Dashboard View
  const displayName = (() => {
    if (user?.displayName) return user.displayName;
    if (clientData?.contactName) return clientData.contactName;
    if (clientData?.contact_name) return clientData.contact_name;
    if (clientData?.name) return clientData.name;
    if (clientData?.businessName) return clientData.businessName;
    if (clientData?.business_name) return clientData.business_name;
    // Format email as readable name: "john.doe99" → "John Doe"
    const raw = user?.email?.split('@')[0] || '';
    return raw.replace(/[._-]/g, ' ').replace(/[0-9]+$/, '').trim().replace(/\b\w/g, c => c.toUpperCase()) || raw;
  })();
  
  const rawStats = clientData?.campaignStats || {};
  const stats = {
    totalCampaigns:  rawStats.totalCampaigns  ?? campaigns.length,
    activeCampaigns: rawStats.activeCampaigns  ?? campaigns.filter(c => c.status === 'active').length,
    postsPublished:  rawStats.postsPublished   ?? 0,
    postsQueued:     rawStats.postsQueued      ?? 0,
    totalLeads:      rawStats.totalLeads       ?? 0,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
      style={{ paddingTop: 'clamp(5rem, 10vw, 8rem)', paddingBottom: '4rem' }}
    >
      <Toaster position="top-right" />
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>Welcome back, <span className="gradient-text">{displayName}</span></h1>
            <p style={{ color: 'var(--text-muted)' }}>Here's your campaign overview</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/submit-brief" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <Plus size={18} /> Submit New Brief +
            </Link>
            <button className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleLogout}>
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {[
            { icon: BarChart3, label: 'Total Campaigns', value: stats.totalCampaigns, color: '#9333EA' },
            { icon: TrendingUp, label: 'Active Campaigns', value: stats.activeCampaigns, color: '#A855F7' },
            { icon: FileText, label: 'Posts Published', value: stats.postsPublished, color: '#C084FC' },
            { icon: Clock,     label: 'Posts Queued',    value: stats.postsQueued,    color: '#9333EA' },
            { icon: User,      label: 'Total Leads',     value: stats.totalLeads,     color: '#A855F7' },
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

        {/* ── Invoices & Payment Section ── */}
        {invoices.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="glass-panel"
            style={{ padding: '2rem', marginBottom: '2rem', marginTop: '2rem' }}
          >
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={24} color="var(--accent-color)" />
              Invoices & Payments
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {invoices.map((inv) => {
                const isPendingVerification = inv.status === 'pending_verification';
                const isPaid = inv.status === 'paid';
                const needsPayment = inv.status === 'sent' || inv.status === 'overdue';
                const isUploading = uploadingPopId === inv.id;

                const statusColor = isPaid
                  ? { bg: 'rgba(34,197,94,0.15)', color: '#22C55E', label: 'Paid' }
                  : isPendingVerification
                  ? { bg: 'rgba(234,179,8,0.15)', color: '#EAB308', label: 'Verifying Payment' }
                  : inv.status === 'overdue'
                  ? { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', label: 'Overdue' }
                  : { bg: 'rgba(59,130,246,0.15)', color: '#60A5FA', label: 'Awaiting Payment' };

                return (
                  <div key={inv.id} style={{
                    padding: '1.25rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: `1px solid ${isPaid ? 'rgba(34,197,94,0.2)' : isPendingVerification ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem', marginBottom: '0.25rem' }}>{inv.invoiceNumber}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Due {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: isPaid ? '#22C55E' : 'var(--text-main)' }}>
                          R {(inv.total || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </span>
                        <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, background: statusColor.bg, color: statusColor.color }}>
                          {statusColor.label}
                        </span>
                      </div>
                    </div>

                    {/* Upload PoP for unpaid invoices */}
                    {(needsPayment || inv.status === 'draft') && !isPendingVerification && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.6rem' }}>
                          Paid via EFT? Upload your proof of payment and we'll verify within 24 hours.
                        </p>
                        <label style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 1.1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                          background: 'rgba(147,51,234,0.15)', border: '1px solid rgba(147,51,234,0.4)',
                          color: '#C084FC', cursor: isUploading ? 'wait' : 'pointer', transition: 'background 0.2s',
                        }}>
                          <Upload size={15} />
                          {isUploading ? 'Uploading…' : 'Upload Proof of Payment'}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            style={{ display: 'none' }}
                            disabled={isUploading}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePopUpload(inv.id, f); e.target.value = ''; }}
                          />
                        </label>
                      </div>
                    )}

                    {/* Pending verification notice */}
                    {isPendingVerification && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <AlertCircle size={16} color="#EAB308" />
                        <p style={{ fontSize: '0.85rem', color: '#EAB308', margin: 0 }}>
                          Proof of payment received — awaiting verification. Your content will be activated once confirmed.
                        </p>
                      </div>
                    )}

                    {/* Paid confirmation */}
                    {isPaid && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <CheckCircle size={16} color="#22C55E" />
                        <p style={{ fontSize: '0.85rem', color: '#22C55E', margin: 0 }}>
                          Payment confirmed{inv.paidDate ? ` on ${new Date(inv.paidDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}. Your content is active!
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Content Calendars Section ── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="glass-panel"
          onMouseEnter={() => setActiveTab('calendars')}
          style={{ padding: '2rem', marginBottom: '2rem', marginTop: '2rem' }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={24} color="var(--accent-color)" />
            Content Calendars
          </h2>

          {contentCalendars.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Calendar size={40} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>No content calendars yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {contentCalendars.map((cal) => {
                const status = calendarStatusMap[cal.status] || calendarStatusMap.scheduled;
                return (
                  <div key={cal.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <p style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.35rem' }}>{cal.campaignName || cal.businessName || 'Content Calendar'}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                          {cal.campaignGoal && <>{cal.campaignGoal} • </>}{formatDate(cal.createdAt)}
                        </p>
                        {cal.platforms && cal.platforms.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {cal.platforms.map((p) => { const b = platformBadge(p); return (
                              <span key={p} style={{ padding: '2px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: b.bg, color: b.color }}>{b.label}</span>
                            ); })}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, background: status.bg, color: status.color, animation: cal.status === 'awaiting_approval' ? 'pulse-badge 2s ease-in-out infinite' : 'none' }}>
                          {status.label}
                        </span>
                        {cal.status === 'awaiting_approval' && cal.approvalLink && (
                          <a href={cal.approvalLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', textDecoration: 'none', boxShadow: '0 0 20px rgba(147,51,234,0.4)' }}>
                            Review & Approve →
                          </a>
                        )}
                        {cal.status === 'approved' && cal.googleDocUrl && (
                          <a href={cal.googleDocUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', textDecoration: 'none' }}>
                            <Eye size={14} /> View Calendar
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Upcoming Posts Section ── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="glass-panel"
          onMouseEnter={() => setActiveTab('posts')}
          style={{ padding: '2rem', marginBottom: '2rem' }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={24} color="var(--accent-color)" />
            Upcoming Posts (Next 7 Days)
          </h2>

          {(() => {
            const now = new Date();
            const limit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const upcoming = scheduledPosts.filter((p) => {
              const d = p.scheduledTime?.toDate ? p.scheduledTime.toDate() : new Date(p.scheduledTime);
              return d >= now && d <= limit;
            });

            if (upcoming.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <Clock size={40} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ color: 'var(--text-muted)' }}>No posts scheduled yet. Submit a brief to get started!</p>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcoming.map((post) => {
                  const pb = platformBadge(post.platform);
                  const caption = post.content || post.caption || '';
                  const statusStyle = post.status === 'published'
                    ? { bg: 'rgba(34,197,94,0.15)', color: '#22C55E' }
                    : post.status === 'failed'
                    ? { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' }
                    : { bg: 'rgba(234,179,8,0.15)', color: '#EAB308' };

                  return (
                    <PostCard
                      key={post.id}
                      post={post}
                      caption={caption}
                      pb={pb}
                      statusStyle={statusStyle}
                    />
                  );
                })}
              </div>
            );
          })()}
        </motion.div>

        {/* ── Bot Dashboard ── */}
        {((clientData?.automations || []).length > 0 || clientData?.botStatus === 'active') && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="glass-panel"
            style={{ padding: '2rem', marginBottom: '2rem', marginTop: '2rem' }}
          >
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={24} color="var(--accent-color)" />
              Your Automation Bots
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '2rem' }}>
              Live status and recent activity across all your active bots.
            </p>

            {/* Stats tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Active Bots',        value: (clientData?.automations || []).length, icon: '🤖' },
                { label: 'Content Batches',     value: botContentBatches.length,              icon: '📅' },
                { label: 'Competitor Digests',  value: botDigests.length,                     icon: '📊' },
                { label: 'Reviews Defended',    value: botReviews.filter(r => r.suggestedReply).length, icon: '⭐' },
                { label: 'Invoices Chased',     value: invoices.filter(i => (i.reminderCount || 0) > 0).length, icon: '💸' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{stat.icon}</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.15rem' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Active bots list */}
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Active Bots</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '2rem' }}>
              {(clientData?.automations || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No bots configured yet — contact us to get started.</p>
              ) : (
                (clientData.automations || []).map(key => {
                  const bot = BOT_LABELS[key];
                  if (!bot) return null;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.9rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '99px', fontSize: '0.82rem' }}>
                      <span>{bot.icon}</span>
                      <span style={{ fontWeight: 600 }}>{bot.name}</span>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', display: 'inline-block', boxShadow: '0 0 5px #22C55E' }} />
                    </div>
                  );
                })
              )}
            </div>

            {/* Activity feed */}
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Recent Activity</p>
            {activityFeed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                <Zap size={28} style={{ marginBottom: '0.6rem', opacity: 0.35 }} />
                <p style={{ fontSize: '0.88rem' }}>Your bots are running — activity will appear here as they work.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activityFeed.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '1.05rem', marginTop: '1px', flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.86rem', margin: '0 0 0.15rem' }}>{item.text}</p>
                      {item.time && <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: 0 }}>{formatDateTime(item.time)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Google Drive Card ── */}
        {clientData?.googleDriveFolderId && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="glass-panel"
            style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FolderOpen size={28} color="var(--accent-color)" />
              <div>
                <p style={{ fontWeight: 600 }}>Your Google Drive Folder</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>All your calendars, assets, and documents live here.</p>
              </div>
            </div>
            <a href={`https://drive.google.com/drive/folders/${clientData.googleDriveFolderId}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <ExternalLink size={16} /> Open My Drive Folder →
            </a>
          </motion.div>
        )}

        {/* Pulse animation for awaiting_approval badge */}
        <style>{`
          @keyframes pulse-badge {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
      <HelpPanel activeTab={activeTab} />
    </motion.div>
  );
};

export default ClientPortal;
