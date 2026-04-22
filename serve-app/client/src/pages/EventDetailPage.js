import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { events as eventsApi, sessions as sessionsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'ministry_admin', 'team_leader'].includes(user?.role);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({ name: '', start_time: '', end_time: '', call_time: '', pre_service_notes: '' });

  useEffect(() => {
    eventsApi.get(id).then(r => setEvent(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      const r = await sessionsApi.create({ ...sessionForm, event_id: id, session_date: event.event_date });
      setEvent(ev => ({ ...ev, sessions: [...(ev.sessions || []), r.data] }));
      setShowCreateSession(false);
      setSessionForm({ name: '', start_time: '', end_time: '', call_time: '', pre_service_notes: '' });
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  if (loading) return <div className="page-body text-muted">Loading…</div>;
  if (!event) return <div className="page-body text-muted">Event not found.</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '4px' }}>
            <Link to="/events" style={{ color: 'var(--brand-mid)' }}>Events</Link> / {event.title}
          </div>
          <h1>{event.title}</h1>
          <div className="subtitle">{format(new Date(event.event_date), 'EEEE, d MMMM yyyy')} · {event.venue}</div>
        </div>
        <div className="flex gap-8 items-center">
          <span className={`badge badge-${event.status}`}>{event.status}</span>
          {isAdmin && <button className="btn btn-primary" onClick={() => setShowCreateSession(true)}>+ Add Session</button>}
        </div>
      </div>

      <div className="page-body">
        {event.description && (
          <div className="card card-pad mb-16" style={{ marginBottom: '16px' }}>
            <p style={{ color: 'var(--ink-mid)', fontSize: '14px', lineHeight: 1.6 }}>{event.description}</p>
          </div>
        )}

        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          Sessions ({event.sessions?.length || 0})
        </h2>

        {event.sessions?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {event.sessions.map(s => (
              <div key={s.id} className="card card-pad">
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{s.name}</div>
                    <div className="flex gap-16 mt-8">
                      {s.start_time && <span className="text-sm text-muted">⏰ {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</span>}
                      {s.call_time && <span className="text-sm" style={{ color: 'var(--accent)' }}>📍 Call time: {s.call_time?.slice(0,5)}</span>}
                      {s.service_lead_name && <span className="text-sm text-muted">👤 {s.service_lead_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-8 items-center">
                    <div className="flex gap-16" style={{ fontSize: '12px', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>{s.accepted_count || 0}</div>
                        <div className="text-muted">Accepted</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--pending)' }}>{s.pending_count || 0}</div>
                        <div className="text-muted">Pending</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{s.declined_count || 0}</div>
                        <div className="text-muted">Declined</div>
                      </div>
                    </div>
                    <span className={`badge badge-${s.status}`}>{s.status}</span>
                    <Link to={`/sessions/${s.id}`} className="btn btn-primary btn-sm">Open Planner →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state card card-pad">
            <div className="icon">🗓️</div>
            <p>No sessions yet. {isAdmin && 'Add a session to start planning.'}</p>
          </div>
        )}
      </div>

      {showCreateSession && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Session</h2>
              <span className="modal-close" onClick={() => setShowCreateSession(false)}>✕</span>
            </div>
            <form onSubmit={handleCreateSession}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Session name *</label>
                  <input className="form-input" value={sessionForm.name} onChange={e => setSessionForm(f => ({...f, name: e.target.value}))} placeholder="e.g. First Service, Second Service" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start time</label>
                    <input className="form-input" type="time" value={sessionForm.start_time} onChange={e => setSessionForm(f => ({...f, start_time: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End time</label>
                    <input className="form-input" type="time" value={sessionForm.end_time} onChange={e => setSessionForm(f => ({...f, end_time: e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Call time (volunteer arrival)</label>
                  <input className="form-input" type="time" value={sessionForm.call_time} onChange={e => setSessionForm(f => ({...f, call_time: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pre-service notes</label>
                  <textarea className="form-textarea" value={sessionForm.pre_service_notes} onChange={e => setSessionForm(f => ({...f, pre_service_notes: e.target.value}))} placeholder="Notes visible to team leaders and scheduled volunteers…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateSession(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Session</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
