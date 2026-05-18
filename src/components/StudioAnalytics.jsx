import React, { useState, useEffect } from 'react';
import { BarChart2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudioStats, getPerformanceLogs, logPerformance, getGenerations } from '../services/contentStudioService';

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok'];

export default function StudioAnalytics({ userEmail }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [tab, setTab] = useState('usage');
  const [logForm, setLogForm] = useState({ generationId: '', platform: 'Instagram', reach: '', likes: '', comments: '', shares: '', clicks: '', conversions: '' });
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    getStudioStats(userEmail).then(setStats).catch(() => {});
    getPerformanceLogs(userEmail).then(setLogs).catch(() => {});
    getGenerations(userEmail, 20).then(setGenerations).catch(() => {});
  }, [userEmail]);

  const maxTypeCount = stats?.typeCounts?.[0]?.[1] || 1;
  const maxDailyCount = Math.max(...(stats?.daily?.map(d => d.count) || [1]), 1);

  const handleLog = async () => {
    if (!logForm.reach || !logForm.likes) { toast.error('Reach and likes are required'); return; }
    setLogging(true);
    try {
      const gen = generations.find(g => g.id === logForm.generationId);
      const result = await logPerformance({
        generationId: logForm.generationId || 'manual',
        userEmail,
        platform: logForm.platform,
        contentType: gen?.contentType || 'Unknown',
        tone: gen?.tone || 'Unknown',
        reach: parseInt(logForm.reach) || 0,
        likes: parseInt(logForm.likes) || 0,
        comments: parseInt(logForm.comments) || 0,
        shares: parseInt(logForm.shares) || 0,
        clicks: parseInt(logForm.clicks) || null,
        conversions: parseInt(logForm.conversions) || null,
      });
      toast.success(`Logged! Score: ${result.score}/100`);
      getPerformanceLogs(userEmail).then(setLogs);
      setLogForm({ generationId: '', platform: 'Instagram', reach: '', likes: '', comments: '', shares: '', clicks: '', conversions: '' });
    } catch {
      toast.error('Failed to log performance');
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="cs-panel-view">
      <div className="cs-panel-header">
        <BarChart2 size={15} />
        Analytics
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {['usage', 'performance'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '3px 10px', borderRadius: 6, border: '1px solid',
              borderColor: tab === t ? '#9333EA' : '#2A2A2A',
              background: tab === t ? 'rgba(147,51,234,0.15)' : 'transparent',
              color: tab === t ? '#C084FC' : '#52525B',
              fontSize: '0.72rem', cursor: 'pointer',
            }}>
              {t === 'usage' ? 'Studio Usage' : 'Post Performance'}
            </button>
          ))}
        </div>
      </div>

      <div className="cs-panel-body">
        {tab === 'usage' && stats && (
          <>
            <div className="cs-stat-grid">
              <div className="cs-stat-card">
                <div className="cs-stat-label">This Month</div>
                <div className="cs-stat-value">{stats.totalThisMonth}</div>
                {stats.delta !== null && (
                  <div className={`cs-stat-delta ${stats.delta >= 0 ? 'up' : 'down'}`}>
                    {stats.delta >= 0 ? '+' : ''}{stats.delta}% vs last month
                  </div>
                )}
              </div>
              <div className="cs-stat-card">
                <div className="cs-stat-label">Top Type</div>
                <div className="cs-stat-value" style={{ fontSize: '0.9rem', marginTop: 4 }}>{stats.topType || '—'}</div>
              </div>
              <div className="cs-stat-card">
                <div className="cs-stat-label">Top Tone</div>
                <div className="cs-stat-value" style={{ fontSize: '0.9rem', marginTop: 4 }}>{stats.topTone || '—'}</div>
              </div>
              <div className="cs-stat-card">
                <div className="cs-stat-label">Last Month</div>
                <div className="cs-stat-value">{stats.totalLastMonth}</div>
              </div>
            </div>

            <div className="cs-section-title">7-Day Volume</div>
            <div className="cs-sparkline" style={{ marginBottom: 20 }}>
              {stats.daily?.map(({ date, count }) => (
                <div key={date} className="cs-spark-bar" style={{ height: `${Math.max(4, (count / maxDailyCount) * 100)}%` }} title={`${date}: ${count}`} />
              ))}
            </div>

            {stats.typeCounts?.length > 0 && (
              <>
                <div className="cs-section-title">Content Types This Month</div>
                {stats.typeCounts.map(([type, count]) => (
                  <div key={type} className="cs-bar-row">
                    <div className="cs-bar-label">{type}</div>
                    <div className="cs-bar-track">
                      <div className="cs-bar-fill" style={{ width: `${(count / maxTypeCount) * 100}%` }} />
                    </div>
                    <div className="cs-bar-count">{count}</div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'performance' && (
          <>
            <div className="cs-perf-form">
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#A1A1AA', marginBottom: 12 }}>Log Post Performance</div>
              <div style={{ marginBottom: 10 }}>
                <div className="cs-form-label">Content Piece (optional)</div>
                <select className="cs-form-input" value={logForm.generationId} onChange={e => setLogForm(f => ({ ...f, generationId: e.target.value }))}>
                  <option value="">— Select a generation —</option>
                  {generations.map(g => (
                    <option key={g.id} value={g.id}>{g.contentType}: {g.output?.slice(0, 40)}…</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div className="cs-form-label">Platform</div>
                <select className="cs-form-input" value={logForm.platform} onChange={e => setLogForm(f => ({ ...f, platform: e.target.value }))}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="cs-perf-grid">
                {['reach', 'likes', 'comments', 'shares', 'clicks', 'conversions'].map(field => (
                  <div key={field}>
                    <div className="cs-form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</div>
                    <input className="cs-form-input" type="number" min="0" value={logForm[field]} onChange={e => setLogForm(f => ({ ...f, [field]: e.target.value }))} placeholder="0" />
                  </div>
                ))}
              </div>
              <button className="cs-save-btn" onClick={handleLog} disabled={logging} style={{ width: '100%' }}>
                <Plus size={14} style={{ marginRight: 6 }} />
                {logging ? 'Logging…' : 'Log Performance'}
              </button>
            </div>

            {logs.length > 0 && (
              <>
                <div className="cs-section-title">Performance Log</div>
                {logs.map(log => (
                  <div key={log.id} style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#A1A1AA' }}>{log.platform} — {log.contentType}</span>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(147,51,234,0.15)', color: '#C084FC', borderRadius: 4, padding: '2px 8px' }}>
                        {log.score}/100
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: '#52525B' }}>
                      <span>Reach: {log.reach?.toLocaleString()}</span>
                      <span>Likes: {log.likes}</span>
                      <span>ER: {log.engagementRate}%</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
