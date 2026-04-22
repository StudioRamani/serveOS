const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, u.name, u.email, u.phone, u.role,
        array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as teams
      FROM volunteers v
      JOIN users u ON u.id = v.user_id
      LEFT JOIN team_memberships tm ON tm.volunteer_id = v.id AND tm.status = 'active'
      LEFT JOIN teams t ON t.id = tm.team_id
      WHERE v.status != 'inactive'
      GROUP BY v.id, u.name, u.email, u.phone, u.role
      ORDER BY u.name
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, email, phone, preferred_name, notes, team_ids } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Welcome123!', 10);
    const userRes = await client.query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1,$2,$3,$4,\'volunteer\') RETURNING id',
      [name, email, phone, hash]
    );
    const userId = userRes.rows[0].id;
    const volRes = await client.query(
      'INSERT INTO volunteers (user_id, preferred_name, notes) VALUES ($1,$2,$3) RETURNING *',
      [userId, preferred_name || name.split(' ')[0], notes]
    );
    if (team_ids?.length) {
      for (const tid of team_ids) {
        await client.query('INSERT INTO team_memberships (volunteer_id, team_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [volRes.rows[0].id, tid]);
      }
    }
    await client.query('COMMIT');
    res.status(201).json({ ...volRes.rows[0], name, email, phone });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const vol = await pool.query(`
      SELECT v.*, u.name, u.email, u.phone, u.campus_id FROM volunteers v
      JOIN users u ON u.id = v.user_id WHERE v.id = $1
    `, [req.params.id]);
    if (!vol.rows[0]) return res.status(404).json({ error: 'Volunteer not found' });
    const teams = await pool.query(`
      SELECT t.*, tm.member_type, tm.status as membership_status
      FROM team_memberships tm JOIN teams t ON t.id = tm.team_id
      WHERE tm.volunteer_id = $1
    `, [req.params.id]);
    const assignments = await pool.query(`
      SELECT sa.*, s.name as session_name, s.session_date, e.title as event_title, tr.name as role_name
      FROM schedule_assignments sa
      JOIN sessions s ON s.id = sa.session_id
      JOIN events e ON e.id = s.event_id
      LEFT JOIN team_roles tr ON tr.id = sa.team_role_id
      WHERE sa.volunteer_id = $1
      ORDER BY s.session_date DESC LIMIT 20
    `, [req.params.id]);
    res.json({ ...vol.rows[0], teams: teams.rows, recentAssignments: assignments.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { preferred_name, notes, status, member_type } = req.body;
  try {
    const result = await pool.query(
      'UPDATE volunteers SET preferred_name=$1, notes=$2, status=$3, member_type=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [preferred_name, notes, status, member_type, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/availability', auth, async (req, res) => {
  const rules = await pool.query('SELECT * FROM availability_rules WHERE volunteer_id = $1 ORDER BY weekday', [req.params.id]);
  const blocked = await pool.query('SELECT * FROM blocked_dates WHERE volunteer_id = $1 AND end_date >= NOW()::date ORDER BY start_date', [req.params.id]);
  res.json({ rules: rules.rows, blockedDates: blocked.rows });
});

router.post('/:id/blocked-dates', auth, async (req, res) => {
  const { start_date, end_date, reason } = req.body;
  const result = await pool.query(
    'INSERT INTO blocked_dates (volunteer_id, start_date, end_date, reason) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.params.id, start_date, end_date, reason]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = router;
