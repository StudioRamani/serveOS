import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboard, scheduling } from '../utils/api';
import { format } from 'date-fns';

const statusBadge = (s) => <span className={`badge badge-${s}`}>{s}</span>;

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'ministry_admin', 'team_leader'].includes(user?.role);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = isAdmin ? dashboard.admin : dashboard.volunteer;
    fn().then(r => setData(r.data)).finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) return <div className="page-body" style={{ color: 'var(--ink-soft)' }}>Loading dashboard…</div>;

  if (!isAdmin) return <VolunteerDashboard data={data} user={user} />;

  const { stats, upcomingEvents } = data || {};

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="subtitle">Welcome back, {user?.preferred_name || user?.name?.split(' ')[0]}</div>
        </div>
        <Link to="/events/new" className="btn btn-primary">+ New Event</Link>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card accent-green">
            <div className="stat-label">Active Volunteers</div>
            <div className="stat-value">{stats?.activeVolunteers ?? '—'}</div>
          </div>
          <div className="stat-card accent-purple">
            <div className="stat-label">Pending Responses</div>
            <div className="stat-value">{stats?.pendingResponses ?? '—'}</div>
          </div>
          <div className="stat-card accent-red">
            <div className="stat-label">Declined — Need Replace</div>
            <div className="stat-value">{stats?.declinedAssignments ?? '—'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Teams</div>
            <div className="stat-value">{stats?.activeTeams ?? '—'}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Upcoming Events</h3>
            <Link to="/events" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          {upcomingEvents?.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Sessions</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map(ev => (
                  <tr key={ev.id}>
                    <td><strong>{ev.title}</strong><br /><span className="text-sm text-muted">{ev.venue}</span></td>
                    <td>{format(new Date(ev.event_date), 'EEE d MMM yyyy')}</td>
                    <td>{ev.session_count} session{ev.session_count !== '1' ? 's' : ''}</td>
                    <td>{statusBadge(ev.status)}</td>
                    <td><Link to={`/events/${ev.id}`} className="btn btn-ghost btn-sm">Open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><div className="icon">📅</div><p>No upcoming events</p></div>
          )}
        </div>
      </div>
    </>
  );
}

function VolunteerDashboard({ data, user }) {
  const [responding, setResponding] = useState(null);
  const [declineData, setDeclineData] = useState({ reason: '', category: '' });
  const [assignments, setAssignments] = useState(data?.assignments || []);

  const handleRespond = async (assignmentId, status) => {
    if (status === 'declined') { setResponding(assignmentId); return; }
    try {
      await scheduling.respond(assignmentId, { status });
      setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, status } : a));
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const submitDecline = async () => {
    if (!declineData.reason) { alert('Please provide a reason'); return; }
    try {
      await scheduling.respond(responding, { status: 'declined', ...declineData });
      setAssignments(prev => prev.map(a => a.id === responding ? { ...a, status: 'declined' } : a));
      setResponding(null); setDeclineData({ reason: '', category: '' });
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Schedule</h1>
          <div className="subtitle">Welcome back, {user?.preferred_name || user?.name?.split(' ')[0]}</div>
        </div>
      </div>
      <div className="page-body">
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
                  <textarea className="form-textarea" value={declineData.reason} onChange={e => setDeclineData(d => ({ ...d, reason: e.target.value }))} placeholder="Please explain why you're unable to serve…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={declineData.category} onChange={e => setDeclineData(d => ({ ...d, category: e.target.value }))}>
                    <option value="">Select a category</option>
                    {['Sick', 'Out of town', 'Work commitment', 'Family responsibility', 'Transport issue', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
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

        {assignments.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {assignments.map(a => (
              <div key={a.id} className="card card-pad">
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>{a.event_title}</div>
                    <div className="text-sm text-muted mt-4">{format(new Date(a.event_date), 'EEE d MMM yyyy')} · {a.session_name} · Call time: {a.call_time?.slice(0,5)}</div>
                    <div className="flex gap-8 mt-8">
                      <span className="tag">{a.team_name}</span>
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
        ) : (
          <div className="empty-state"><div className="icon">📋</div><p>No upcoming assignments</p></div>
        )}
      </div>
    </>
  );
}
