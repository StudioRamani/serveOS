import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sessions as sessionsApi, flow as flowApi, scheduling as schedulingApi, teams as teamsApi, volunteers as volApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const ITEM_TYPES = [
  { value: 'prayer', label: 'Prayer', icon: '🙏' },
  { value: 'worship', label: 'Worship', icon: '🎵' },
  { value: 'sermon', label: 'Sermon', icon: '📖' },
  { value: 'offering', label: 'Offering', icon: '💰' },
  { value: 'host', label: 'Host/Welcome', icon: '👋' },
  { value: 'ministry', label: 'Ministry', icon: '✨' },
  { value: 'announcement', label: 'Announcement', icon: '📢' },
  { value: 'fellowship', label: 'Fellowship', icon: '☕' },
  { value: 'other', label: 'Other', icon: '📌' },
];

const typeIcon = (t) => ITEM_TYPES.find(i => i.value === t)?.icon || '📌';

export default function SessionPlannerPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'ministry_admin', 'team_leader'].includes(user?.role);

  const [session, setSession] = useState(null);
  const [flowItems, setFlowItems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('flow');

  // Flow item modal
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [flowForm, setFlowForm] = useState({ title: '', item_type: 'worship', planned_start_time: '', duration_minutes: '', responsible_team_id: '', notes: '' });

  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null); // { team_id, team_role_id, role_name, team_name }
  const [teamMembers, setTeamMembers] = useState([]);
  const [conflictInfo, setConflictInfo] = useState({});

  // Decline modal
  const [responding, setResponding] = useState(null);
  const [declineData, setDeclineData] = useState({ reason: '', category: '' });

  useEffect(() => {
    Promise.all([
      sessionsApi.get(id),
      teamsApi.list(),
    ]).then(([sRes, tRes]) => {
      setSession(sRes.data);
      setFlowItems(sRes.data.flowItems || []);
      setAssignments(sRes.data.assignments || []);
      setTeams(tRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  // Flow CRUD
  const openFlowModal = (item = null) => {
    if (item) {
      setEditingFlow(item);
      setFlowForm({ title: item.title, item_type: item.item_type, planned_start_time: item.planned_start_time || '', duration_minutes: item.duration_minutes || '', responsible_team_id: item.responsible_team_id || '', notes: item.notes || '' });
    } else {
      setEditingFlow(null);
      setFlowForm({ title: '', item_type: 'worship', planned_start_time: '', duration_minutes: '', responsible_team_id: '', notes: '' });
    }
    setShowFlowModal(true);
  };

  const handleFlowSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFlow) {
        const r = await flowApi.update(editingFlow.id, flowForm);
        setFlowItems(prev => prev.map(f => f.id === editingFlow.id ? { ...f, ...r.data } : f));
      } else {
        const r = await flowApi.create({ ...flowForm, session_id: id, sequence_no: flowItems.length + 1 });
        setFlowItems(prev => [...prev, r.data]);
      }
      setShowFlowModal(false);
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handleDeleteFlow = async (itemId) => {
    if (!window.confirm('Delete this flow item?')) return;
    await flowApi.delete(itemId);
    setFlowItems(prev => prev.filter(f => f.id !== itemId));
  };

  const moveItem = async (index, direction) => {
    const newItems = [...flowItems];
    const target = index + direction;
    if (target < 0 || target >= newItems.length) return;
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
    const reordered = newItems.map((item, i) => ({ ...item, sequence_no: i + 1 }));
    setFlowItems(reordered);
    await flowApi.reorder(reordered.map(({ id, sequence_no }) => ({ id, sequence_no })));
  };

  // Scheduling
  const openAssignModal = async (team, role) => {
    setAssignTarget({ team_id: team.id, team_role_id: role.id, role_name: role.name, team_name: team.name });
    const teamData = await teamsApi.get(team.id);
    setTeamMembers(teamData.data.members || []);
    setShowAssignModal(true);
    setConflictInfo({});
  };

  const checkConflict = async (volunteerId) => {
    try {
      const r = await schedulingApi.checkConflict({ volunteer_id: volunteerId, session_id: id });
      setConflictInfo(prev => ({ ...prev, [volunteerId]: r.data }));
    } catch {}
  };

  const handleAssign = async (volunteerId) => {
    try {
      const r = await schedulingApi.assign({ session_id: id, team_id: assignTarget.team_id, team_role_id: assignTarget.team_role_id, volunteer_id: volunteerId });
      const member = teamMembers.find(m => m.volunteer_id === volunteerId);
      setAssignments(prev => [...prev.filter(a => !(a.team_role_id === assignTarget.team_role_id && a.volunteer_id === volunteerId)), {
        ...r.data, volunteer_name: member?.name, team_name: assignTarget.team_name, role_name: assignTarget.role_name
      }]);
      setShowAssignModal(false);
    } catch (err) { alert(err.response?.data?.error || 'Error assigning volunteer'); }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    await schedulingApi.remove(assignmentId);
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  };

  const handlePublish = async () => {
    if (!window.confirm('Publish this session? All assigned volunteers will be notified.')) return;
    await sessionsApi.publish(id);
    setSession(s => ({ ...s, status: 'published' }));
  };

  // Volunteer respond (when viewing own assignments in session)
  const handleRespond = async (assignmentId, status) => {
    if (status === 'declined') { setResponding(assignmentId); return; }
    await schedulingApi.respond(assignmentId, { status });
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, status } : a));
  };

  const submitDecline = async () => {
    if (!declineData.reason) { alert('Please provide a reason'); return; }
    await schedulingApi.respond(responding, { status: 'declined', ...declineData });
    setAssignments(prev => prev.map(a => a.id === responding ? { ...a, status: 'declined' } : a));
    setResponding(null); setDeclineData({ reason: '', category: '' });
  };

  // Group assignments by team
  const assignmentsByTeam = assignments.reduce((acc, a) => {
    const key = a.team_name || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  if (loading) return <div className="page-body text-muted">Loading session…</div>;
  if (!session) return <div className="page-body text-muted">Session not found.</div>;

  const myAssignment = assignments.find(a => {
    // find by user's volunteer_id - approximate
    return a.status === 'pending' && user?.role === 'volunteer';
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '4px' }}>
            <Link to="/events" style={{ color: 'var(--brand-mid)' }}>Events</Link> / <Link to={`/events/${session.event_id}`} style={{ color: 'var(--brand-mid)' }}>{session.event_title}</Link> / {session.name}
          </div>
          <h1>{session.name}</h1>
          <div className="flex gap-16 mt-4">
            <span className="text-sm text-muted">{session.event_date ? format(new Date(session.event_date), 'EEEE, d MMMM yyyy') : ''}</span>
            {session.start_time && <span className="text-sm text-muted">⏰ {session.start_time?.slice(0,5)} – {session.end_time?.slice(0,5)}</span>}
            {session.call_time && <span className="text-sm" style={{ color: 'var(--accent)', fontWeight: 500 }}>📍 Call time: {session.call_time?.slice(0,5)}</span>}
          </div>
        </div>
        <div className="flex gap-8 items-center">
          <span className={`badge badge-${session.status}`}>{session.status}</span>
          {isAdmin && session.status === 'draft' && (
            <button className="btn btn-primary" onClick={handlePublish}>Publish Session</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-soft)', padding: '0 32px' }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {['flow', 'schedule', 'overview'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 16px', fontSize: '13.5px', fontWeight: 500, color: activeTab === tab ? 'var(--brand-mid)' : 'var(--ink-soft)', borderBottom: activeTab === tab ? '2px solid var(--brand-mid)' : '2px solid transparent', background: 'none', cursor: 'pointer', textTransform: 'capitalize' }}>
              {tab === 'flow' ? '📋 Order of Service' : tab === 'schedule' ? '👥 Schedule' : '📊 Overview'}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {/* Flow Tab */}
        {activeTab === 'flow' && (
          <div>
            {isAdmin && (
              <div className="flex justify-between mb-16">
                <p className="text-sm text-muted">Drag items to reorder or use the arrows.</p>
                <button className="btn btn-primary" onClick={() => openFlowModal()}>+ Add Flow Item</button>
              </div>
            )}

            {flowItems.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {flowItems.map((item, index) => (
                  <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'stretch' }}>
                    <div style={{ width: '4px', borderRadius: '10px 0 0 10px', background: item.item_type === 'worship' ? 'var(--brand-light)' : item.item_type === 'sermon' ? 'var(--pending)' : item.item_type === 'prayer' || item.item_type === 'ministry' ? 'var(--gold)' : item.item_type === 'offering' ? 'var(--success)' : 'var(--ink-faint)', flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', flex: 1, gap: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-faint)', width: '24px', textAlign: 'right', flexShrink: 0 }}>{index + 1}</div>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{typeIcon(item.item_type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.title}</div>
                        <div className="flex gap-12 mt-4">
                          {item.planned_start_time && <span className="text-sm text-muted">⏰ {item.planned_start_time?.slice(0,5)}</span>}
                          {item.duration_minutes && <span className="text-sm text-muted">{item.duration_minutes} min</span>}
                          {item.team_name && <span className="text-sm" style={{ color: 'var(--brand-mid)' }}>👥 {item.team_name}</span>}
                        </div>
                        {item.assignees?.length > 0 && (
                          <div className="flex gap-8 mt-8" style={{ flexWrap: 'wrap' }}>
                            {item.assignees.map(a => (
                              <div key={a.id} className="flex items-center gap-4" style={{ padding: '2px 8px', background: 'var(--brand-pale)', borderRadius: '20px', fontSize: '12px', color: 'var(--brand)' }}>
                                <div className="avatar" style={{ width: 16, height: 16, fontSize: '9px' }}>{(a.preferred_name || a.name)?.slice(0,2)?.toUpperCase()}</div>
                                {a.preferred_name || a.name} {a.role_name && `· ${a.role_name}`}
                              </div>
                            ))}
                          </div>
                        )}
                        {item.notes && <div className="text-sm text-muted mt-4" style={{ fontStyle: 'italic' }}>{item.notes}</div>}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-4" style={{ flexShrink: 0 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => moveItem(index, -1)} disabled={index === 0}>↑</button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => moveItem(index, 1)} disabled={index === flowItems.length - 1}>↓</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openFlowModal(item)}>Edit</button>
                          <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDeleteFlow(item.id)}>✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state card card-pad">
                <div className="icon">📋</div>
                <p>No flow items yet. {isAdmin && 'Add the order of service.'}</p>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div>
            {isAdmin && (
              <div className="mb-16">
                <p className="text-sm text-muted">Assign volunteers to roles for this session. Click a role to open the assignment panel.</p>
              </div>
            )}

            {teams.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {teams.map(team => {
                  const teamRoles = team.roles || [];
                  return (
                    <div key={team.id} className="card">
                      <div className="card-header">
                        <h3>{team.name}</h3>
                        <span className="text-sm text-muted">{team.category}</span>
                      </div>
                      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {teamRoles.map(role => {
                          const roleAssignments = assignments.filter(a => a.team_role_id === role.id);
                          return (
                            <div key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                              <div style={{ minWidth: '140px', fontSize: '13.5px', fontWeight: 500 }}>{role.name}</div>
                              <div className="flex gap-8" style={{ flex: 1, flexWrap: 'wrap' }}>
                                {roleAssignments.length ? roleAssignments.map(a => (
                                  <div key={a.id} className="flex items-center gap-6" style={{ padding: '4px 10px', borderRadius: '20px', background: a.status === 'accepted' ? 'var(--success-light)' : a.status === 'declined' ? 'var(--danger-light)' : 'var(--surface-3)', fontSize: '12.5px' }}>
                                    <span style={{ fontWeight: 500, color: a.status === 'accepted' ? 'var(--success)' : a.status === 'declined' ? 'var(--danger)' : 'var(--ink-mid)' }}>
                                      {a.volunteer_name}
                                    </span>
                                    <span className={`badge badge-${a.status}`} style={{ fontSize: '10px', padding: '1px 5px' }}>{a.status}</span>
                                    {isAdmin && <button style={{ fontSize: '11px', color: 'var(--ink-faint)', cursor: 'pointer', background: 'none', border: 'none', padding: '0 0 0 4px' }} onClick={() => handleRemoveAssignment(a.id)}>✕</button>}
                                  </div>
                                )) : <span className="text-sm text-muted">Unassigned</span>}
                              </div>
                              {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => openAssignModal(team, role)}>Assign</button>}
                            </div>
                          );
                        })}
                        {!teamRoles.length && <p className="text-sm text-muted" style={{ padding: '8px' }}>No roles defined for this team.</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="empty-state card card-pad"><p>No teams available.</p></div>}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {session.pre_service_notes && (
              <div className="card card-pad mb-16" style={{ marginBottom: '16px', borderLeft: '3px solid var(--gold)', background: 'var(--gold-light)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: 'var(--gold)' }}>Pre-service Notes</div>
                <p style={{ fontSize: '14px', color: 'var(--ink-mid)', lineHeight: 1.6 }}>{session.pre_service_notes}</p>
              </div>
            )}

            <div className="grid-2" style={{ alignItems: 'start' }}>
              {/* Order of Service Summary */}
              <div className="card">
                <div className="card-header"><h3>Order of Service</h3></div>
                <div style={{ padding: '8px 0' }}>
                  {flowItems.map((item, i) => (
                    <div key={item.id} style={{ display: 'flex', gap: '12px', padding: '10px 16px', borderBottom: i < flowItems.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                      <div style={{ fontSize: '12px', color: 'var(--ink-faint)', width: '20px', flexShrink: 0, paddingTop: '2px' }}>{i + 1}</div>
                      <div style={{ fontSize: '16px', flexShrink: 0 }}>{typeIcon(item.item_type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '13.5px' }}>{item.title}</div>
                        {item.planned_start_time && <div className="text-sm text-muted">{item.planned_start_time?.slice(0,5)}</div>}
                        {item.assignees?.map(a => (
                          <div key={a.id} className="text-sm" style={{ color: 'var(--brand-mid)', marginTop: '2px' }}>{a.preferred_name || a.name}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!flowItems.length && <div className="empty-state" style={{ padding: '24px' }}><p>No flow items yet</p></div>}
                </div>
              </div>

              {/* All teams serving */}
              <div className="card">
                <div className="card-header"><h3>Teams Serving</h3></div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(assignmentsByTeam).map(([teamName, teamAssignments]) => (
                    <div key={teamName}>
                      <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-soft)', marginBottom: '6px' }}>{teamName}</div>
                      {teamAssignments.map(a => (
                        <div key={a.id} className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                          <div className="flex items-center gap-8">
                            <div className="avatar avatar-sm">{a.volunteer_name?.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 500 }}>{a.volunteer_name}</div>
                              <div className="text-sm text-muted">{a.role_name}</div>
                            </div>
                          </div>
                          <span className={`badge badge-${a.status}`}>{a.status}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {!assignments.length && <p className="text-sm text-muted">No volunteers assigned yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Flow Item Modal */}
      {showFlowModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingFlow ? 'Edit' : 'Add'} Flow Item</h2>
              <span className="modal-close" onClick={() => setShowFlowModal(false)}>✕</span>
            </div>
            <form onSubmit={handleFlowSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={flowForm.title} onChange={e => setFlowForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Opening worship, Sermon, Altar call…" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={flowForm.item_type} onChange={e => setFlowForm(f => ({...f, item_type: e.target.value}))}>
                      {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start time</label>
                    <input className="form-input" type="time" value={flowForm.planned_start_time} onChange={e => setFlowForm(f => ({...f, planned_start_time: e.target.value}))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Duration (min)</label>
                    <input className="form-input" type="number" value={flowForm.duration_minutes} onChange={e => setFlowForm(f => ({...f, duration_minutes: e.target.value}))} placeholder="e.g. 20" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Responsible team</label>
                    <select className="form-select" value={flowForm.responsible_team_id} onChange={e => setFlowForm(f => ({...f, responsible_team_id: e.target.value}))}>
                      <option value="">None</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={flowForm.notes} onChange={e => setFlowForm(f => ({...f, notes: e.target.value}))} placeholder="Internal notes for team leaders…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFlowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingFlow ? 'Save Changes' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Volunteer Modal */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <h2>Assign Volunteer</h2>
                <div className="text-sm text-muted mt-4">{assignTarget?.team_name} · {assignTarget?.role_name}</div>
              </div>
              <span className="modal-close" onClick={() => setShowAssignModal(false)}>✕</span>
            </div>
            <div className="modal-body">
              {teamMembers.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {teamMembers.map(m => {
                    const conflict = conflictInfo[m.volunteer_id];
                    const alreadyAssigned = assignments.some(a => a.volunteer_id === m.volunteer_id && a.team_role_id === assignTarget?.team_role_id);
                    return (
                      <div key={m.volunteer_id} className="flex items-center justify-between" style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: conflict?.hasConflict ? '1px solid var(--warning)' : '1px solid transparent' }}>
                        <div className="flex items-center gap-12">
                          <div className="avatar avatar-sm">{m.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{m.name}</div>
                            <div className="text-sm text-muted">{m.member_type}</div>
                            {conflict?.hasConflict && (
                              <div className="text-sm" style={{ color: 'var(--warning)' }}>⚠️ Conflict: serving in another session this day</div>
                            )}
                            {conflict && !conflict.hasConflict && (
                              <div className="text-sm" style={{ color: 'var(--success)' }}>✓ Available</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-8">
                          {!conflict && <button className="btn btn-ghost btn-sm" onClick={() => checkConflict(m.volunteer_id)}>Check availability</button>}
                          {alreadyAssigned
                            ? <span className="badge badge-accepted">Assigned</span>
                            : <button className="btn btn-primary btn-sm" onClick={() => handleAssign(m.volunteer_id)} disabled={conflict?.hasConflict}>Assign</button>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-muted">No members in this team.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
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
                <textarea className="form-textarea" value={declineData.reason} onChange={e => setDeclineData(d => ({...d, reason: e.target.value}))} placeholder="Please explain why you're unable to serve…" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={declineData.category} onChange={e => setDeclineData(d => ({...d, category: e.target.value}))}>
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
    </>
  );
}
