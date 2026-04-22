const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(result.rows);
});

router.patch('/:id/read', auth, async (req, res) => {
  await pool.query('UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
});

router.patch('/read-all', auth, async (req, res) => {
  await pool.query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL', [req.user.id]);
  res.json({ success: true });
});

module.exports = router;
