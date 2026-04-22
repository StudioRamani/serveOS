import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { events as eventsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export default function EventsPage() {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'ministry_admin'].includes(user?.role);
  const [eventsList, setEventsList] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState('calendar');
  const [form, setForm] = useState({ title: '', event_date: '', start_time: '', end_time: '', venue: '', event_type: 'sunday_service', description: '' });

  useEffect(() => {
    eventsApi.list().then(r => setEventsList(r.data)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const r = await eventsApi.create(form);
      setEventsList(prev => [r.data, ...prev]);
      setShowCreate(false);
      setForm({ title: '', event_date: '', start_time: '', end_time: '', venue: '', event_type: 'sunday_service', description: '' });
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const getEventsForDay = (day) => eventsList.filter(e => isSameDay(new Date(e.event_date), day));

  const eventTypes = [
    { value: 'sunday_service', label: 'Sunday Service' },
    { value: 'prayer', label: 'Prayer Meeting' },
    { value: 'youth', label: 'Youth Service' },
    { value: 'special', label: 'Special Event' },
    { value: 'rehearsal', label: 'Rehearsal' },
    { value: 'conference', label: 'Conference' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Events</h1>
          <div className="subtitle">Plan and manage your church calendar</div>
        </div>
        <div className="flex gap-8">
          <button className={`btn ${view === 'calendar' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('calendar')}>Calendar</button>
          <button className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('list')}>List</button>
          {isAdmin && <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Event</button>}
        </div>
      </div>

      <div className="page-body">
        {loading ? <p className="text-muted">Loading…</p> : view === 'calendar' ? (
          <div className="card">
            {/* Calendar header */}
            <div className="card-header">
              <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>← Prev</button>
              <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>Next →</button>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-soft)' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ background: 'var(--surface-2)', padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{d}</div>
                ))}
                {/* Empty cells before month start */}
                {Array(new Date(monthDays[0]).getDay()).fill(null).map((_, i) => (
                  <div key={`e${i}`} style={{ background: 'var(--surface)', minHeight: '90px' }} />
                ))}
                {monthDays.map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day} style={{ background: 'var(--surface)', minHeight: '90px', padding: '8px', borderTop: isToday ? '2px solid var(--brand-light)' : 'none' }}>
                      <div style={{ fontSize: '13px', fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--brand-mid)' : 'var(--ink-mid)', marginBottom: '6px' }}>
                        {format(day, 'd')}
                      </div>
                      {dayEvents.map(ev => (
                        <Link key={ev.id} to={`/events/${ev.id}`} style={{ display: 'block', padding: '3px 6px', borderRadius: '3px', background: ev.status === 'published' ? 'var(--brand-pale)' : 'var(--surface-3)', color: ev.status === 'published' ? 'var(--brand)' : 'var(--ink-mid)', fontSize: '11.5px', fontWeight: 500, marginBottom: '3px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {ev.title}
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            {eventsList.length ? (
              <table className="data-table">
                <thead><tr><th>Event</th><th>Date</th><th>Venue</th><th>Type</th><th>Sessions</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {eventsList.map(ev => (
                    <tr key={ev.id}>
                      <td><strong>{ev.title}</strong></td>
                      <td>{format(new Date(ev.event_date), 'EEE d MMM yyyy')}</td>
                      <td className="text-muted">{ev.venue || '—'}</td>
                      <td>{ev.event_type?.replace('_', ' ')}</td>
                      <td>{ev.session_count}</td>
                      <td><span className={`badge badge-${ev.status}`}>{ev.status}</span></td>
                      <td><Link to={`/events/${ev.id}`} className="btn btn-ghost btn-sm">Open →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty-state"><div className="icon">📅</div><p>No events yet</p></div>}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>Create New Event</h2>
              <span className="modal-close" onClick={() => setShowCreate(false)}>✕</span>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Event title *</label>
                  <input className="form-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Sunday Services — 25 May 2026" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input className="form-input" type="date" value={form.event_date} onChange={e => setForm(f => ({...f, event_date: e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.event_type} onChange={e => setForm(f => ({...f, event_type: e.target.value}))}>
                      {eventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start time</label>
                    <input className="form-input" type="time" value={form.start_time} onChange={e => setForm(f => ({...f, start_time: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End time</label>
                    <input className="form-input" type="time" value={form.end_time} onChange={e => setForm(f => ({...f, end_time: e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Venue</label>
                  <input className="form-input" value={form.venue} onChange={e => setForm(f => ({...f, venue: e.target.value}))} placeholder="e.g. Main Auditorium" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
