const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

// Get assignments for a session
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sa.*, u.name as volunteer_name, v.preferred_name, v.photo_url,
        t.name as team_name, tr.name as role_name
      FROM schedule_assignments sa
      JOIN volunteers v ON v.id = sa.volunteer_id
      JOIN users u ON u.id = v.user_id
      LEFT JOIN teams t ON t.id = sa.team_id
      LEFT JOIN team_roles tr ON tr.id = sa.team_role_id
      WHERE sa.session_id = $1
      ORDER BY t.name, tr.name, u.name
    `, [req.params.sessionId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Check conflicts for a volunteer on a session date
router.get('/conflict-check', auth, async (req, res) => {
  const { volunteer_id, session_id } = req.query;
  try {
    const session = await pool.query('SELECT s.*, e.event_date FROM sessions s JOIN events e ON e.id = s.event_id WHERE s.id = $1', [session_id]);
    if (!session.rows[0]) return res.status(404).json({ error: 'Session not found' });

    const conflicts = await pool.query(`
      SELECT sa.session_id, s.name as session_name, s.start_time, e.event_date
      FROM schedule_assignments sa
      JOIN sessions s ON s.id = sa.session_id
      JOIN events e ON e.id = s.event_id
      WHERE sa.volunteer_id = $1
        AND e.event_date = $2
        AND sa.session_id != $3
        AND sa.status != 'declined'
    `, [volunteer_id, session.rows[0].event_date, session_id]);

    const blocked = await pool.query(
      'SELECT * FROM blocked_dates WHERE volunteer_id = $1 AND start_date <= $2 AND end_date >= $2',
      [volunteer_id, session.rows[0].event_date]
    );

    res.json({ conflicts: conflicts.rows, blockedDates: blocked.rows, hasConflict: conflicts.rows.length > 0 || blocked.rows.length > 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assign volunteer to session
router.post('/', auth, async (req, res) => {
  const { session_id, team_id, team_role_id, volunteer_id, response_due_at } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO schedule_assignments (session_id, team_id, team_role_id, volunteer_id, response_due_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (session_id, team_role_id, volunteer_id) DO UPDATE SET status='pending', responded_at=NULL
       RETURNING *`,
      [session_id, team_id, team_role_id, volunteer_id, response_due_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Respond to assignment (volunteer)
router.patch('/:id/respond', auth, async (req, res) => {
  const { status, decline_reason, decline_category } = req.body;
  if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (status === 'declined' && !decline_reason) return res.status(400).json({ error: 'Decline reason is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE schedule_assignments SET status=$1, decline_reason=$2, decline_category=$3, responded_at=NOW() WHERE id=$4 RETURNING *",
      [status, decline_reason, decline_category, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Assignment not found' });

    // Notify team leader if declined
    if (status === 'declined') {
      const assignment = result.rows[0];
      const session = await client.query('SELECT s.*, t.leader_user_id FROM sessions s JOIN events e ON e.id = s.event_id LEFT JOIN schedule_assignments sa ON sa.session_id = s.id LEFT JOIN teams t ON t.id = sa.team_id WHERE s.id = $1 LIMIT 1', [assignment.session_id]);
      if (session.rows[0]?.leader_user_id) {
        await client.query(
          "INSERT INTO notifications (user_id, type, title, body, related_id, related_type) VALUES ($1,'decline','A volunteer has declined','A volunteer declined their assignment and a replacement may be needed.',$2,'assignment')",
          [session.rows[0].leader_user_id, req.params.id]
        );
      }
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// Remove assignment
router.delete('/:id', auth, async (req, res) => {
  await pool.query('DELETE FROM schedule_assignments WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// Get suggested volunteers for a role/session
router.get('/suggest', auth, async (req, res) => {
  const { team_id, team_role_id, session_id } = req.query;
  try {
    const session = await pool.query('SELECT s.*, e.event_date FROM sessions s JOIN events e ON e.id = s.event_id WHERE s.id = $1', [session_id]);
    if (!session.rows[0]) return res.status(404).json({ error: 'Session not found' });
    const date = session.rows[0].event_date;
    const dow = new Date(date).getDay();

    const result = await pool.query(`
      SELECT v.id, u.name, v.preferred_name, v.photo_url,
        COUNT(sa.id) as recent_service_count,
        BOOL_OR(bd.id IS NOT NULL) as has_blocked_date,
        BOOL_OR(ar.is_available = false) as marked_unavailable
      FROM volunteers v
      JOIN users u ON u.id = v.user_id
      JOIN team_memberships tm ON tm.volunteer_id = v.id AND tm.team_id = $1 AND tm.status = 'active'
      LEFT JOIN volunteer_capabilities vc ON vc.volunteer_id = v.id AND vc.team_role_id = $2
      LEFT JOIN schedule_assignments sa ON sa.volunteer_id = v.id AND sa.assigned_at > NOW() - INTERVAL '30 days'
      LEFT JOIN blocked_dates bd ON bd.volunteer_id = v.id AND bd.start_date <= $3 AND bd.end_date >= $3
      LEFT JOIN availability_rules ar ON ar.volunteer_id = v.id AND ar.weekday = $4
      WHERE v.status = 'active'
        AND v.id NOT IN (SELECT volunteer_id FROM schedule_assignments WHERE session_id = $5)
      GROUP BY v.id, u.name, v.preferred_name, v.photo_url
      HAVING BOOL_OR(bd.id IS NOT NULL) = false AND (BOOL_OR(ar.is_available = false) = false OR BOOL_OR(ar.is_available IS NULL) = true)
      ORDER BY recent_service_count ASC, u.name
      LIMIT 10
    `, [team_id, team_role_id || null, date, dow, session_id]);

    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
