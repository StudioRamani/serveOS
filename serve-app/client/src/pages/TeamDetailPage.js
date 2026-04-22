import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teams as teamsApi, volunteers as volApi } from '../utils/api';

export default function TeamDetailPage() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [allVols, setAllVols] = useState([]);
  const [roleName, setRoleName] = useState('');
  const [selectedVol, setSelectedVol] = useState('');

  useEffect(() => {
    teamsApi.get(id).then(r => setTeam(r.data)).finally(() => setLoading(false));
  }, [id]);

  const loadVols = async () => {
    const r = await volApi.list();
    setAllVols(r.data);
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    const r = await teamsApi.addRole(id, { name: roleName });
    setTeam(t => ({ ...t, roles: [...(t.roles || []), r.data] }));
    setRoleName(''); setShowAddRole(false);
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Delete this role?')) return;
    await teamsApi.deleteRole(id, roleId);
    setTeam(t => ({ ...t, roles: t.roles.filter(r => r.id !== roleId) }));
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    await teamsApi.addMember(id, { volunteer_id: selectedVol });
    teamsApi.get(id).then(r => setTeam(r.data));
    setSelectedVol(''); setShowAddMember(false);
  };

  const handleRemoveMember = async (volunteerId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    await teamsApi.removeMember(id, volunteerId);
    setTeam(t => ({ ...t, members: t.members.filter(m => m.volunteer_id !== volunteerId) }));
  };

  if (loading) return <div className="page-body text-muted">Loading…</div>;
  if (!team) return <div className="page-body text-muted">Team not found.</div>;

  const memberIds = new Set(team.members?.map(m => m.volunteer_id));

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '4px' }}>
            <Link to="/teams" style={{ color: 'var(--brand-mid)' }}>Teams</Link> / {team.name}
          </div>
          <h1>{team.name}</h1>
          <div className="subtitle">{team.category} · {team.members?.length || 0} members</div>
        </div>
        <span className={`badge badge-${team.status}`}>{team.status}</span>
      </div>

      <div className="page-body">
        <div className="grid-2">
          {/* Roles */}
          <div className="card">
            <div className="card-header">
              <h3>Roles ({team.roles?.length || 0})</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddRole(true)}>+ Add Role</button>
            </div>
            <div className="card-body">
              {team.roles?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {team.roles.map(role => (
                    <div key={role.id} className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 500 }}>{role.name}</span>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteRole(role.id)}>✕</button>
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state" style={{ padding: '24px' }}><p>No roles defined yet</p></div>}
            </div>
          </div>

          {/* Members */}
          <div className="card">
            <div className="card-header">
              <h3>Members ({team.members?.length || 0})</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddMember(true); loadVols(); }}>+ Add Member</button>
            </div>
            <div className="card-body">
              {team.members?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {team.members.map(m => (
                    <div key={m.volunteer_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-12">
                        <div className="avatar avatar-sm">{m.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 500 }}>{m.preferred_name || m.name}</div>
                          <div className="text-sm text-muted">{m.member_type}</div>
                        </div>
                      </div>
                      <div className="flex gap-8 items-center">
                        <Link to={`/volunteers/${m.volunteer_id}`} className="btn btn-ghost btn-sm">View</Link>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleRemoveMember(m.volunteer_id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state" style={{ padding: '24px' }}><p>No members yet</p></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Add Role Modal */}
      {showAddRole && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Role to {team.name}</h2>
              <span className="modal-close" onClick={() => setShowAddRole(false)}>✕</span>
            </div>
            <form onSubmit={handleAddRole}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Role name *</label>
                  <input className="form-input" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Lead Usher, Keys, Sound Engineer" required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRole(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Role</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Member</h2>
              <span className="modal-close" onClick={() => setShowAddMember(false)}>✕</span>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select volunteer *</label>
                  <select className="form-select" value={selectedVol} onChange={e => setSelectedVol(e.target.value)} required>
                    <option value="">Choose a volunteer…</option>
                    {allVols.filter(v => !memberIds.has(v.id)).map(v => (
                      <option key={v.id} value={v.id}>{v.name} {v.preferred_name && v.preferred_name !== v.name ? `(${v.preferred_name})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMember(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add to Team</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
