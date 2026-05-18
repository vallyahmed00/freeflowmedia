import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleGeneration } from '../services/contentStudioService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getCategoryClass(category) {
  const c = (category || '').toLowerCase();
  if (c === 'social') return 'social';
  if (c === 'email') return 'email';
  if (c === 'ads') return 'ads';
  if (c === 'long form') return 'longform';
  return 'social';
}

export default function ContentCalendar({ userEmail, history }) {
  const [date, setDate] = useState(new Date());

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const scheduled = useMemo(() => {
    const map = {};
    (history || []).forEach(item => {
      if (item.scheduledDate) {
        const d = item.scheduledDate.toDate ? item.scheduledDate.toDate() : new Date(item.scheduledDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        if (map[key].length < 3) map[key].push(item);
      }
    });
    return map;
  }, [history]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  const monthName = date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

  return (
    <div className="cs-panel-view">
      <div className="cs-panel-header">
        <Calendar size={15} />
        Content Calendar
      </div>
      <div className="cs-panel-body">
        <div className="cs-calendar-nav">
          <button className="cs-nav-btn" onClick={() => setDate(new Date(year, month - 1, 1))}><ChevronLeft size={14} /></button>
          <h3>{monthName}</h3>
          <button className="cs-nav-btn" onClick={() => setDate(new Date(year, month + 1, 1))}><ChevronRight size={14} /></button>
        </div>

        <div className="cs-calendar-grid">
          {DAYS.map(d => (
            <div key={d} className="cs-cal-header-cell">{d}</div>
          ))}
          {cells.map((cell, idx) => {
            if (!cell.day) return <div key={idx} className="cs-cal-cell other-month" />;
            const isToday = today.getDate() === cell.day && today.getMonth() === month && today.getFullYear() === year;
            const key = `${year}-${month}-${cell.day}`;
            const chips = scheduled[key] || [];
            return (
              <div key={idx} className={`cs-cal-cell${isToday ? ' today' : ''}`}>
                <div className={`cs-cal-day-num${isToday ? ' today' : ''}`}>{cell.day}</div>
                {chips.map(item => (
                  <div key={item.id} className={`cs-cal-chip ${getCategoryClass(item.category)}`} title={item.output?.slice(0, 80)}>
                    {item.contentType}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {(history || []).filter(h => !h.scheduledDate).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="cs-section-title">Unscheduled</div>
            {history.filter(h => !h.scheduledDate).slice(0, 10).map(item => (
              <div key={item.id} style={{ background: '#111111', border: '1px solid #1E1E1E', borderRadius: 6, padding: '8px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9333EA', textTransform: 'uppercase', marginBottom: 2 }}>{item.contentType}</div>
                  <div style={{ fontSize: '0.72rem', color: '#52525B' }}>{item.output?.slice(0, 50)}…</div>
                </div>
                <button onClick={async () => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  try {
                    await scheduleGeneration(item.id, d);
                    toast.success('Scheduled for tomorrow');
                  } catch { toast.error('Schedule failed'); }
                }} style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: 5, border: '1px solid #2A2A2A', background: 'transparent', color: '#71717A', cursor: 'pointer' }}>
                  Tomorrow
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
