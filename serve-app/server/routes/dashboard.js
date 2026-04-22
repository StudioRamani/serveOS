const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

router.get('/admin', auth, async (req, res) => {
  try {
    const [upcoming, pending, declined, teams, volunteers] = await Promise.all([
      pool.query("SELECT e.*, COUNT(s.id) as session_count FROM events e LEFT JOIN sessions s ON s.event_id = e.id WHERE e.event_date >= NOW()::date GROUP BY e.id ORDER BY e.event_date LIMIT 5"),
      pool.query("SELECT COUNT(*) as count FROM schedule_assignments WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) as count FROM schedule_assignments WHERE status = 'declined'"),
      pool.query("SELECT COUNT(*) as count FROM teams WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) as count FROM volunteers WHERE status = 'active'"),
    ]);
    res.json({
      upcomingEvents: upcoming.rows,
      stats: {
        pendingResponses: parseInt(pending.rows[0].count),
        declinedAssignments: parseInt(declined.rows[0].count),
        activeTeams: parseInt(teams.rows[0].count),
        activeVolunteers: parseInt(volunteers.rows[0].count),
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/volunteer', auth, async (req, res) => {
  try {
    const volRes = await pool.query('SELECT id FROM volunteers WHERE user_id = $1', [req.user.id]);
    if (!volRes.rows[0]) return res.json({ assignments: [], notifications: [] });
    const volunteerId = volRes.rows[0].id;

    const [assignments, notifications] = await Promise.all([
      pool.query(`
        SELECT sa.*, s.name as session_name, s.start_time, s.call_time, e.title as event_title,
          e.event_date, e.venue, t.name as team_name, tr.name as role_name
        FROM schedule_assignments sa
        JOIN sessions s ON s.id = sa.session_id
        JOIN events e ON e.id = s.event_id
        LEFT JOIN teams t ON t.id = sa.team_id
        LEFT JOIN team_roles tr ON tr.id = sa.team_role_id
        WHERE sa.volunteer_id = $1 AND e.event_date >= NOW()::date
        ORDER BY e.event_date, s.start_time
      `, [volunteerId]),
      pool.query("SELECT * FROM notifications WHERE user_id = $1 AND read_at IS NULL ORDER BY created_at DESC LIMIT 10", [req.user.id]),
    ]);

    res.json({ assignments: assignments.rows, notifications: notifications.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
