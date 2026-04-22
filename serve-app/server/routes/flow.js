const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

router.get('/session/:sessionId', auth, async (req, res) => {
  const result = await pool.query(`
    SELECT fi.*, t.name as team_name,
      json_agg(json_build_object(
        'id', fia.id, 'volunteer_id', fia.volunteer_id,
        'name', u.name, 'preferred_name', v.preferred_name, 'role_name', tr.name
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
  `, [req.params.sessionId]);
  res.json(result.rows);
});

router.post('/', auth, async (req, res) => {
  const { session_id, sequence_no, title, item_type, planned_start_time, duration_minutes, description, responsible_team_id, notes, visibility } = req.body;
  const result = await pool.query(
    'INSERT INTO flow_items (session_id, sequence_no, title, item_type, planned_start_time, duration_minutes, description, responsible_team_id, notes, visibility) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
    [session_id, sequence_no, title, item_type, planned_start_time, duration_minutes, description, responsible_team_id, notes, visibility || 'all']
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', auth, async (req, res) => {
  const { sequence_no, title, item_type, planned_start_time, duration_minutes, description, responsible_team_id, notes, visibility } = req.body;
  const result = await pool.query(
    'UPDATE flow_items SET sequence_no=$1, title=$2, item_type=$3, planned_start_time=$4, duration_minutes=$5, description=$6, responsible_team_id=$7, notes=$8, visibility=$9 WHERE id=$10 RETURNING *',
    [sequence_no, title, item_type, planned_start_time, duration_minutes, description, responsible_team_id, notes, visibility, req.params.id]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  await pool.query('DELETE FROM flow_items WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// Reorder flow items
router.post('/reorder', auth, async (req, res) => {
  const { items } = req.body; // [{ id, sequence_no }]
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      await client.query('UPDATE flow_items SET sequence_no=$1 WHERE id=$2', [item.sequence_no, item.id]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// Assign volunteer to flow item
router.post('/:id/assign', auth, async (req, res) => {
  const { volunteer_id, team_role_id } = req.body;
  const result = await pool.query(
    'INSERT INTO flow_item_assignments (flow_item_id, volunteer_id, team_role_id) VALUES ($1,$2,$3) ON CONFLICT (flow_item_id, volunteer_id) DO UPDATE SET team_role_id=$3 RETURNING *',
    [req.params.id, volunteer_id, team_role_id]
  );
  res.status(201).json(result.rows[0]);
});

router.delete('/:id/assign/:volunteerId', auth, async (req, res) => {
  await pool.query('DELETE FROM flow_item_assignments WHERE flow_item_id=$1 AND volunteer_id=$2', [req.params.id, req.params.volunteerId]);
  res.json({ success: true });
});

module.exports = router;
