const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { event_id, name, session_date, start_time, end_time, call_time, service_lead_id, pre_service_notes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sessions (event_id, name, session_date, start_time, end_time, call_time, service_lead_id, pre_service_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [event_id, name, session_date, start_time, end_time, call_time, service_lead_id, pre_service_notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const session = await pool.query(`
      SELECT s.*, e.title as event_title, e.event_date, e.venue, u.name as service_lead_name
      FROM sessions s
      JOIN events e ON e.id = s.event_id
      LEFT JOIN users u ON u.id = s.service_lead_id
      WHERE s.id = $1
    `, [req.params.id]);
    if (!session.rows[0]) return res.status(404).json({ error: 'Session not found' });

    const flowItems = await pool.query(`
      SELECT fi.*, t.name as team_name,
        json_agg(json_build_object(
          'id', fia.id, 'volunteer_id', fia.volunteer_id,
          'name', u.name, 'preferred_name', v.preferred_name,
          'role_name', tr.name
        )) FILTER (WHERE fia.id IS NOT NULL) as assignees
      FROM flow_items fi
      LEFT JOIN teams t ON t.id = fi.responsible_team_id
      LEFT JOIN flow_item_assignments fia ON fia.flow_item_id = fi.id
      LEFT JOIN volunteers v ON v.id = fia.volunteer_id
      LEFT JOIN users u ON u.id = v.user_id
      LEFT JOIN team_roles tr ON tr.id = fia.team_role_id
      WHERE fi.session_id = $1
      GROUP BY fi.id, t.name
      ORDER BY fi.sequence_no
    `, [req.params.id]);

    const assignments = await pool.query(`
      SELECT sa.*, u.name as volunteer_name, v.preferred_name,
        t.name as team_name, tr.name as role_name
      FROM schedule_assignments sa
      JOIN volunteers v ON v.id = sa.volunteer_id
      JOIN users u ON u.id = v.user_id
      LEFT JOIN teams t ON t.id = sa.team_id
      LEFT JOIN team_roles tr ON tr.id = sa.team_role_id
      WHERE sa.session_id = $1
      ORDER BY t.name, tr.name
    `, [req.params.id]);

    res.json({ ...session.rows[0], flowItems: flowItems.rows, assignments: assignments.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, start_time, end_time, call_time, service_lead_id, pre_service_notes, post_service_notes, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE sessions SET name=$1, start_time=$2, end_time=$3, call_time=$4, service_lead_id=$5, pre_service_notes=$6, post_service_notes=$7, status=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [name, start_time, end_time, call_time, service_lead_id, pre_service_notes, post_service_notes, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/publish', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("UPDATE sessions SET status='published', updated_at=NOW() WHERE id=$1", [req.params.id]);
    // Notify assigned volunteers
    const assignments = await client.query(
      "SELECT sa.*, v.user_id, u.name FROM schedule_assignments sa JOIN volunteers v ON v.id = sa.volunteer_id JOIN users u ON u.id = v.user_id WHERE sa.session_id = $1",
      [req.params.id]
    );
    for (const a of assignments.rows) {
      await client.query(
        "INSERT INTO notifications (user_id, type, title, body, related_id, related_type) VALUES ($1,'assignment','You have a new assignment','You have been assigned to serve. Please log in to accept or decline.',$2,'session')",
        [a.user_id, req.params.id]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

module.exports = router;
