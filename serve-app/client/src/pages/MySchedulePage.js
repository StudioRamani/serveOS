import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboard, scheduling, notifications as notifApi } from '../utils/api';
import { format } from 'date-fns';

export function MySchedulePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [declineData, setDeclineData] = useState({ reason: '', category: '' });

  useEffect(() => {
    dashboard.volunteer().then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const handleRespond = async (id, status) => {
    if (status === 'declined') { setResponding(id); return; }
    await scheduling.respond(id, { status });
    setData(d => ({ ...d, assignments: d.assignments.map(a => a.id === id ? { ...a, status } : a) }));
  };

  const submitDecline = async () => {
    if (!declineData.reason) return alert('Please provide a reason');
    await scheduling.respond(responding, { status: 'declined', ...declineData });
    setData(d => ({ ...d, assignments: d.assignments.map(a => a.id === responding ? { ...a, status: 'declined' } : a) }));
    setResponding(null); setDeclineData({ reason: '', category: '' });
  };

  if (loading) return <div className="page-body text-muted">Loading…</div>;

  return (
    <>
      <div className="page-header"><h1>My Schedule</h1></div>
      <div className="page-body">
        {data?.assignments?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.assignments.map(a => (
              <div key={a.id} className="card card-pad">
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{a.event_title}</div>
                    <div className="text-sm text-muted mt-4">
                      {a.event_date ? format(new Date(a.event_date), 'EEE d MMM yyyy') : ''} · {a.session_name}
                    </div>
                    {a.call_time && <div className="text-sm mt-4" style={{ color: 'var(--accent)' }}>Call time: {a.call_time?.slice(0,5)}</div>}
                    <div className="flex gap-8 mt-8">
                      {a.team_name && <span className="tag">{a.team_name}</span>}
                      {a.role_name && <span className="tag">{a.role_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    {a.status === 'pending' ? (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => handleRespond(a.id, 'accepted')}>Accept</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRespond(a.id, 'declined')}>Decline</button>
                      </>
                    ) : <span className={`badge badge-${a.status}`}>{a.status}</span>}
                  </div>
                </div>
                <div className="mt-8">
                  <Link to={`/sessions/${a.session_id}`} className="text-sm" style={{ color: 'var(--brand-mid)' }}>View order of service →</Link>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state card card-pad"><div className="icon">📋</div><p>No upcoming assignments</p></div>}

        {responding && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Decline Assignment</h2>
                <span className="modal-close" onClick={() => setResponding(null)}>✕</span>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Reason (required)</label>
                  <textarea className="form-textarea" value={declineData.reason} onChange={e => setDeclineData(d => ({...d, reason: e.target.value}))} placeholder="Why are you unable to serve?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={declineData.category} onChange={e => setDeclineData(d => ({...d, category: e.target.value}))}>
                    <option value="">Select…</option>
                    {['Sick','Out of town','Work commitment','Family responsibility','Transport issue','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setResponding(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={submitDecline}>Submit decline</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notifApi.list().then(r => setNotifs(r.data)).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await notifApi.markRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    await notifApi.markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <div className="subtitle">{notifs.filter(n => !n.read_at).length} unread</div>
        </div>
        {notifs.some(n => !n.read_at) && <button className="btn btn-secondary" onClick={markAllRead}>Mark all read</button>}
      </div>
      <div className="page-body">
        {loading ? <p className="text-muted">Loading…</p> : notifs.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifs.map(n => (
              <div key={n.id} className="card card-pad" style={{ opacity: n.read_at ? 0.6 : 1, borderLeft: n.read_at ? '' : '3px solid var(--brand-light)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{n.title}</div>
                    {n.body && <div className="text-sm text-muted mt-4">{n.body}</div>}
                    <div className="text-sm text-muted mt-8">{format(new Date(n.created_at), 'd MMM yyyy · HH:mm')}</div>
                  </div>
                  {!n.read_at && <button className="btn btn-ghost btn-sm" onClick={() => markRead(n.id)}>Mark read</button>}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty-state card card-pad"><div className="icon">🔔</div><p>No notifications yet</p></div>}
      </div>
    </>
  );
}
