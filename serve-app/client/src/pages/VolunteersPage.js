import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { volunteers as volApi, teams as teamsApi } from '../utils/api';

export default function VolunteersPage() {
  const [vols, setVols] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [allTeams, setAllTeams] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', preferred_name: '', team_ids: [] });

  useEffect(() => {
    volApi.list().then(r => { setVols(r.data); setFiltered(r.data); }).finally(() => setLoading(false));
    teamsApi.list().then(r => setAllTeams(r.data));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(vols.filter(v => v.name?.toLowerCase().includes(q) || v.email?.toLowerCase().includes(q) || v.preferred_name?.toLowerCase().includes(q)));
  }, [search, vols]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const r = await volApi.create(form);
      setVols(prev => [...prev, r.data]);
      setShowCreate(false); setForm({ name: '', email: '', phone: '', preferred_name: '', team_ids: [] });
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const toggleTeam = (id) => setForm(f => ({ ...f, team_ids: f.team_ids.includes(id) ? f.team_ids.filter(t => t !== id) : [...f.team_ids, id] }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Volunteers</h1>
          <div className="subtitle">{vols.length} registered volunteers</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Volunteer</button>
      </div>

      <div className="page-body">
        <div className="card" style={{ marginBottom: '16px', padding: '12px 16px' }}>
          <input className="form-input" style={{ border: 'none', padding: '4px 0', outline: 'none', fontSize: '14px' }} placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="card">
          {loading ? <div className="empty-state">Loading…</div> : filtered.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Teams</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div className="flex items-center gap-12">
                        <div className="avatar avatar-sm">{v.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{v.name}</div>
                          {v.preferred_name && v.preferred_name !== v.name && <div className="text-sm text-muted">{v.preferred_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{v.email}</div>
                      {v.phone && <div className="text-sm text-muted">{v.phone}</div>}
                    </td>
                    <td>
                      <div className="flex" style={{ flexWrap: 'wrap', gap: '4px' }}>
                        {v.teams?.filter(Boolean).map(t => <span key={t} className="tag">{t}</span>)}
                      </div>
                    </td>
                    <td><span className={`badge badge-${v.status || 'active'}`}>{v.status || 'active'}</span></td>
                    <td><Link to={`/volunteers/${v.id}`} className="btn btn-ghost btn-sm">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty-state"><div className="icon">🙋</div><p>No volunteers found</p></div>}
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>Add Volunteer</h2>
              <span className="modal-close" onClick={() => setShowCreate(false)}>✕</span>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preferred name</label>
                    <input className="form-input" value={form.preferred_name} onChange={e => setForm(f => ({...f, preferred_name: e.target.value}))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign to teams</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    {allTeams.map(t => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', border: `1px solid ${form.team_ids.includes(t.id) ? 'var(--brand-light)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: form.team_ids.includes(t.id) ? 'var(--brand-pale)' : 'var(--surface)', fontSize: '13px' }}>
                        <input type="checkbox" checked={form.team_ids.includes(t.id)} onChange={() => toggleTeam(t.id)} style={{ display: 'none' }} />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted mt-8">Default password: <strong>Welcome123!</strong> — volunteer can change on first login.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Volunteer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
