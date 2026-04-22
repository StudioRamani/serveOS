import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { volunteers as volApi } from '../utils/api';
import { format } from 'date-fns';

export default function VolunteerProfilePage() {
  const { id } = useParams();
  const [vol, setVol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    volApi.get(id).then(r => setVol(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-body text-muted">Loading…</div>;
  if (!vol) return <div className="page-body text-muted">Volunteer not found.</div>;

  const initials = vol.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '4px' }}>
            <Link to="/volunteers" style={{ color: 'var(--brand-mid)' }}>Volunteers</Link> / {vol.name}
          </div>
          <h1>{vol.name}</h1>
          <div className="subtitle">{vol.teams?.map(t => t.name).join(' · ')}</div>
        </div>
        <span className={`badge badge-${vol.status}`}>{vol.status}</span>
      </div>

      <div className="page-body">
        <div className="grid-2" style={{ gridTemplateColumns: '300px 1fr', alignItems: 'start' }}>
          {/* Profile card */}
          <div className="card card-pad">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div className="avatar avatar-lg" style={{ width: 64, height: 64, fontSize: '22px', margin: '0 auto 12px' }}>{initials}</div>
              <div style={{ fontWeight: 600, fontSize: '16px' }}>{vol.name}</div>
              {vol.preferred_name && <div className="text-sm text-muted">"{vol.preferred_name}"</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {vol.email && <div><span className="text-sm text-muted">Email</span><div style={{ fontSize: '13.5px' }}>{vol.email}</div></div>}
              {vol.phone && <div><span className="text-sm text-muted">Phone</span><div style={{ fontSize: '13.5px' }}>{vol.phone}</div></div>}
              <div>
                <span className="text-sm text-muted">Status</span>
                <div><span className={`badge badge-${vol.status}`}>{vol.status}</span></div>
              </div>
              {vol.notes && <div><span className="text-sm text-muted">Notes</span><div style={{ fontSize: '13.5px', color: 'var(--ink-mid)' }}>{vol.notes}</div></div>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Teams */}
            <div className="card">
              <div className="card-header"><h3>Team Memberships</h3></div>
              <div className="card-body">
                {vol.teams?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {vol.teams.map(t => (
                      <div key={t.id} className="flex items-center justify-between">
                        <div>
                          <div style={{ fontWeight: 500 }}>{t.name}</div>
                          <div className="text-sm text-muted">{t.category}</div>
                        </div>
                        <div className="flex gap-8">
                          <span className={`badge badge-${t.membership_status}`}>{t.member_type}</span>
                          <Link to={`/teams/${t.id}`} className="btn btn-ghost btn-sm">View →</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted">Not assigned to any teams.</p>}
              </div>
            </div>

            {/* Recent assignments */}
            <div className="card">
              <div className="card-header"><h3>Recent Assignments</h3></div>
              {vol.recentAssignments?.length ? (
                <table className="data-table">
                  <thead><tr><th>Event</th><th>Session</th><th>Role</th><th>Status</th></tr></thead>
                  <tbody>
                    {vol.recentAssignments.map(a => (
                      <tr key={a.id}>
                        <td>{a.event_title}<br /><span className="text-sm text-muted">{a.session_date ? format(new Date(a.session_date), 'd MMM yyyy') : '—'}</span></td>
                        <td>{a.session_name}</td>
                        <td>{a.role_name || '—'}</td>
                        <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="empty-state" style={{ padding: '24px' }}><p>No assignments yet</p></div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
