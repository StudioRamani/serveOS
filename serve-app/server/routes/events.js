const router = require('express').Router();
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { month, year, status } = req.query;
  try {
    let q = `
      SELECT e.*, u.name as created_by_name,
        COUNT(DISTINCT s.id) as session_count
      FROM events e
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN sessions s ON s.event_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (month && year) {
      params.push(year, month);
      q += ` AND EXTRACT(YEAR FROM e.event_date)=$${params.length-1} AND EXTRACT(MONTH FROM e.event_date)=$${params.length}`;
    }
    if (status) { params.push(status); q += ` AND e.status=$${params.length}`; }
    q += ' GROUP BY e.id, u.name ORDER BY e.event_date DESC';
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, requireRole('super_admin', 'ministry_admin'), async (req, res) => {
  const { title, event_date, start_time, end_time, campus_id, venue, event_type, description, notes } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO events (title, event_date, start_time, end_time, campus_id, venue, event_type, description, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [title, event_date, start_time, end_time, campus_id, venue, event_type, description, notes, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const event = await pool.query('SELECT e.*, u.name as created_by_name FROM events e LEFT JOIN users u ON u.id = e.created_by WHERE e.id = $1', [req.params.id]);
    if (!event.rows[0]) return res.status(404).json({ error: 'Event not found' });
    const sessions = await pool.query(`
      SELECT s.*, u.name as service_lead_name,
        COUNT(DISTINCT sa.id) as assignment_count,
        COUNT(DISTINCT sa.id) FILTER (WHERE sa.status = 'accepted') as accepted_count,
        COUNT(DISTINCT sa.id) FILTER (WHERE sa.status = 'pending') as pending_count,
        COUNT(DISTINCT sa.id) FILTER (WHERE sa.status = 'declined') as declined_count
      FROM sessions s
      LEFT JOIN users u ON u.id = s.service_lead_id
      LEFT JOIN schedule_assignments sa ON sa.session_id = s.id
      WHERE s.event_id = $1
      GROUP BY s.id, u.name
      ORDER BY s.start_time
    `, [req.params.id]);
    res.json({ ...event.rows[0], sessions: sessions.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { title, event_date, start_time, end_time, venue, event_type, description, notes, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE events SET title=$1, event_date=$2, start_time=$3, end_time=$4, venue=$5, event_type=$6, description=$7, notes=$8, status=$9, updated_at=NOW() WHERE id=$10 RETURNING *',
      [title, event_date, start_time, end_time, venue, event_type, description, notes, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
