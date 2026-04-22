const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

// Availability
router.get('/:volunteerId', auth, async (req, res) => {
  const rules = await pool.query('SELECT * FROM availability_rules WHERE volunteer_id = $1 ORDER BY weekday', [req.params.volunteerId]);
  const blocked = await pool.query('SELECT * FROM blocked_dates WHERE volunteer_id = $1 ORDER BY start_date', [req.params.volunteerId]);
  res.json({ rules: rules.rows, blockedDates: blocked.rows });
});

router.post('/:volunteerId/rules', auth, async (req, res) => {
  const { weekday, is_available, start_time, end_time, max_services_per_month } = req.body;
  const result = await pool.query(
    `INSERT INTO availability_rules (volunteer_id, weekday, is_available, start_time, end_time, max_services_per_month)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.volunteerId, weekday, is_available, start_time, end_time, max_services_per_month]
  );
  res.status(201).json(result.rows[0]);
});

module.exports = router;
