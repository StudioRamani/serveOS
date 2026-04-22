require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcryptjs');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Campus
    const campusRes = await client.query(`
      INSERT INTO campuses (name, address) VALUES
      ('Main Campus', '123 Church Street, City Centre')
      ON CONFLICT DO NOTHING RETURNING id
    `);
    const campusId = campusRes.rows[0]?.id || (await client.query('SELECT id FROM campuses LIMIT 1')).rows[0].id;

    // Users
    const hash = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (id, name, email, phone, password_hash, role, campus_id) VALUES
      ('00000000-0000-0000-0000-000000000001', 'Pastor James Admin', 'admin@church.org', '+27 82 000 0001', $1, 'super_admin', $2),
      ('00000000-0000-0000-0000-000000000002', 'Sarah Leader', 'sarah@church.org', '+27 82 000 0002', $1, 'team_leader', $2),
      ('00000000-0000-0000-0000-000000000003', 'John Volunteer', 'john@church.org', '+27 82 000 0003', $1, 'volunteer', $2),
      ('00000000-0000-0000-0000-000000000004', 'Mary Volunteer', 'mary@church.org', '+27 82 000 0004', $1, 'volunteer', $2),
      ('00000000-0000-0000-0000-000000000005', 'Peter Volunteer', 'peter@church.org', '+27 82 000 0005', $1, 'volunteer', $2),
      ('00000000-0000-0000-0000-000000000006', 'Grace Volunteer', 'grace@church.org', '+27 82 000 0006', $1, 'volunteer', $2),
      ('00000000-0000-0000-0000-000000000007', 'David Musician', 'david@church.org', '+27 82 000 0007', $1, 'volunteer', $2),
      ('00000000-0000-0000-0000-000000000008', 'Lisa Singer', 'lisa@church.org', '+27 82 000 0008', $1, 'volunteer', $2)
      ON CONFLICT (email) DO NOTHING
    `, [hash, campusId]);

    // Volunteers
    await client.query(`
      INSERT INTO volunteers (user_id, preferred_name, status) VALUES
      ('00000000-0000-0000-0000-000000000002', 'Sarah', 'active'),
      ('00000000-0000-0000-0000-000000000003', 'John', 'active'),
      ('00000000-0000-0000-0000-000000000004', 'Mary', 'active'),
      ('00000000-0000-0000-0000-000000000005', 'Peter', 'active'),
      ('00000000-0000-0000-0000-000000000006', 'Grace', 'active'),
      ('00000000-0000-0000-0000-000000000007', 'David', 'active'),
      ('00000000-0000-0000-0000-000000000008', 'Lisa', 'active')
      ON CONFLICT (user_id) DO NOTHING
    `);

    // Teams
    const teamsRes = await client.query(`
      INSERT INTO teams (name, category, description, campus_id, leader_user_id) VALUES
      ('Band', 'Worship', 'Instrumental music team', $1, '00000000-0000-0000-0000-000000000002'),
      ('Singers', 'Worship', 'Vocal worship team', $1, '00000000-0000-0000-0000-000000000002'),
      ('Ushers', 'Hospitality', 'Welcome and seating team', $1, '00000000-0000-0000-0000-000000000002'),
      ('Prayer Team', 'Ministry', 'Intercession and altar ministry', $1, '00000000-0000-0000-0000-000000000002'),
      ('Media Team', 'Technical', 'Sound, visuals, and livestream', $1, '00000000-0000-0000-0000-000000000002')
      RETURNING id, name
    `, [campusId]);

    const teamMap = {};
    teamsRes.rows.forEach(t => teamMap[t.name] = t.id);

    // Team Roles
    await client.query(`
      INSERT INTO team_roles (team_id, name) VALUES
      ($1, 'Music Director'), ($1, 'Keys'), ($1, 'Bass'), ($1, 'Drums'), ($1, 'Electric Guitar'), ($1, 'Acoustic Guitar'),
      ($2, 'Lead Vocalist'), ($2, 'Alto'), ($2, 'Tenor'), ($2, 'BGV Left'), ($2, 'BGV Right'),
      ($3, 'Lead Usher'), ($3, 'Main Door'), ($3, 'Auditorium'), ($3, 'Offering'),
      ($4, 'Prayer Lead'), ($4, 'Altar Ministry'), ($4, 'Intercessor'),
      ($5, 'Sound Engineer'), ($5, 'Visuals Operator'), ($5, 'Livestream')
    `, [teamMap['Band'], teamMap['Singers'], teamMap['Ushers'], teamMap['Prayer Team'], teamMap['Media Team']]);

    // Events
    const eventRes = await client.query(`
      INSERT INTO events (title, event_date, start_time, end_time, campus_id, venue, event_type, status, created_by) VALUES
      ('Sunday Services', '2026-05-25', '07:30', '13:00', $1, 'Main Auditorium', 'sunday_service', 'published', '00000000-0000-0000-0000-000000000001'),
      ('Friday Prayer Night', '2026-05-22', '18:00', '20:00', $1, 'Main Auditorium', 'prayer', 'draft', '00000000-0000-0000-0000-000000000001')
      RETURNING id, title
    `, [campusId]);

    const sundayEventId = eventRes.rows[0].id;

    // Sessions
    const sessionRes = await client.query(`
      INSERT INTO sessions (event_id, name, session_date, start_time, end_time, call_time, service_lead_id, status) VALUES
      ($1, 'First Service', '2026-05-25', '08:00', '10:00', '07:00', '00000000-0000-0000-0000-000000000001', 'published'),
      ($1, 'Second Service', '2026-05-25', '10:30', '12:30', '09:30', '00000000-0000-0000-0000-000000000001', 'draft')
      RETURNING id
    `, [sundayEventId]);

    const sessionId = sessionRes.rows[0].id;

    // Flow Items
    await client.query(`
      INSERT INTO flow_items (session_id, sequence_no, title, item_type, planned_start_time, duration_minutes, responsible_team_id) VALUES
      ($1, 1, 'Pre-service prayer', 'prayer', '07:50', 10, $2),
      ($1, 2, 'Welcome & announcements', 'host', '08:00', 5, $3),
      ($1, 3, 'Opening worship set', 'worship', '08:05', 20, $4),
      ($1, 4, 'Offering exhortation', 'offering', '08:25', 5, NULL),
      ($1, 5, 'Sermon', 'sermon', '08:30', 40, NULL),
      ($1, 6, 'Altar call', 'ministry', '09:10', 15, $2),
      ($1, 7, 'Closing prayer', 'prayer', '09:25', 5, $2),
      ($1, 8, 'Post-service fellowship', 'fellowship', '09:30', 30, $3)
    `, [sessionId, teamMap['Prayer Team'], teamMap['Ushers'], teamMap['Band']]);

    await client.query('COMMIT');
    console.log('✅ Seed completed successfully');
    console.log('\nLogin credentials:');
    console.log('  Super Admin: admin@church.org / password123');
    console.log('  Team Leader: sarah@church.org / password123');
    console.log('  Volunteer:   john@church.org / password123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

seed();
