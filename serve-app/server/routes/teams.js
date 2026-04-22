const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.name as leader_name,
        COUNT(DISTINCT tm.id) FILTER (WHERE tm.status = 'active') as member_count,
        COUNT(DISTINCT tr.id) as role_count
      FROM teams t
      LEFT JOIN users u ON u.id = t.leader_user_id
      LEFT JOIN team_memberships tm ON tm.team_id = t.id
      LEFT JOIN team_roles tr ON tr.team_id = t.id
      WHERE t.status != 'archived'
      GROUP BY t.id, u.name
      ORDER BY t.name
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, requireRole('super_admin', 'ministry_admin'), async (req, res) => {
  const { name, category, description, campus_id, leader_user_id, default_call_time_offset } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO teams (name, category, description, campus_id, leader_user_id, default_call_time_offset) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, category, description, campus_id, leader_user_id, default_call_time_offset || 60]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const team = await pool.query('SELECT t.*, u.name as leader_name FROM teams t LEFT JOIN users u ON u.id = t.leader_user_id WHERE t.id = $1', [req.params.id]);
    if (!team.rows[0]) return res.status(404).json({ error: 'Team not found' });
    const roles = await pool.query('SELECT * FROM team_roles WHERE team_id = $1 ORDER BY name', [req.params.id]);
    const members = await pool.query(`
      SELECT tm.*, u.name, u.email, u.phone, v.preferred_name, v.photo_url, v.status as vol_status
      FROM team_memberships tm
      JOIN volunteers v ON v.id = tm.volunteer_id
      JOIN users u ON u.id = v.user_id
      WHERE tm.team_id = $1 AND tm.status = 'active'
      ORDER BY u.name
    `, [req.params.id]);
    res.json({ ...team.rows[0], roles: roles.rows, members: members.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, requireRole('super_admin', 'ministry_admin', 'team_leader'), async (req, res) => {
  const { name, category, description, campus_id, leader_user_id, status, default_call_time_offset } = req.body;
  try {
    const result = await pool.query(
      'UPDATE teams SET name=$1, category=$2, description=$3, campus_id=$4, leader_user_id=$5, status=$6, default_call_time_offset=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [name, category, description, campus_id, leader_user_id, status, default_call_time_offset, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Team roles
router.get('/:id/roles', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM team_roles WHERE team_id = $1 ORDER BY name', [req.params.id]);
  res.json(result.rows);
});

router.post('/:id/roles', auth, async (req, res) => {
  const { name, description } = req.body;
  const result = await pool.query('INSERT INTO team_roles (team_id, name, description) VALUES ($1,$2,$3) RETURNING *', [req.params.id, name, description]);
  res.status(201).json(result.rows[0]);
});

router.delete('/:id/roles/:roleId', auth, async (req, res) => {
  await pool.query('DELETE FROM team_roles WHERE id = $1 AND team_id = $2', [req.params.roleId, req.params.id]);
  res.json({ success: true });
});

// Team members
router.post('/:id/members', auth, async (req, res) => {
  const { volunteer_id, member_type } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO team_memberships (volunteer_id, team_id, member_type) VALUES ($1,$2,$3) ON CONFLICT (volunteer_id, team_id) DO UPDATE SET status=\'active\' RETURNING *',
      [volunteer_id, req.params.id, member_type || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/members/:volunteerId', auth, async (req, res) => {
  await pool.query('UPDATE team_memberships SET status=\'inactive\' WHERE team_id=$1 AND volunteer_id=$2', [req.params.id, req.params.volunteerId]);
  res.json({ success: true });
});

module.exports = router;
