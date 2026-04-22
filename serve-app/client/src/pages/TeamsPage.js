import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teams as teamsApi } from '../utils/api';

export default function TeamsPage() {
  const [teamsList, setTeamsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', description: '' });

  useEffect(() => {
    teamsApi.list().then(r => setTeamsList(r.data)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const r = await teamsApi.create(form);
      setTeamsList(prev => [...prev, r.data]);
      setShowCreate(false); setForm({ name: '', category: '', description: '' });
    } catch (err) { alert(err.response?.data?.error || 'Error creating team'); }
  };

  const categories = ['Worship', 'Hospitality', 'Ministry', 'Technical', 'Kids', 'Security', 'Other'];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Teams</h1>
          <div className="subtitle">{teamsList.length} team{teamsList.length !== 1 ? 's' : ''} in your ministry</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Team</button>
      </div>

      <div className="page-body">
        {loading ? <p className="text-muted">Loading…</p> : (
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {teamsList.map(team => (
              <Link key={team.id} to={`/teams/${team.id}`} style={{ textDecoration: 'none' }}>
                <div className="card card-pad" style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                  <div className="flex items-center justify-between mb-16">
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{team.name}</div>
                      <div className="text-sm text-muted mt-4">{team.category || 'General'}</div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--brand-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      {team.category === 'Worship' ? '🎵' : team.category === 'Hospitality' ? '🤝' : team.category === 'Technical' ? '🎛️' : team.category === 'Ministry' ? '🙏' : '👥'}
                    </div>
                  </div>
                  {team.description && <p className="text-sm text-muted mb-16" style={{ lineHeight: 1.5 }}>{team.description}</p>}
                  <div className="flex gap-16">
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--brand-mid)' }}>{team.member_count || 0}</div>
                      <div className="text-sm text-muted">members</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink-mid)' }}>{team.role_count || 0}</div>
                      <div className="text-sm text-muted">roles</div>
                    </div>
                  </div>
                  {team.leader_name && (
                    <div className="flex items-center gap-8 mt-16" style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '12px' }}>
                      <div className="avatar avatar-sm">{team.leader_name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                      <span className="text-sm text-muted">{team.leader_name}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {showCreate && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Create New Team</h2>
                <span className="modal-close" onClick={() => setShowCreate(false)}>✕</span>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Team name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Band, Ushers, Prayer Team" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Briefly describe this team's role…" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Team</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
