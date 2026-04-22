require('dotenv').config();
const pool = require('./pool');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS campuses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'volunteer',
        campus_id UUID REFERENCES campuses(id),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS volunteers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        preferred_name VARCHAR(255),
        photo_url TEXT,
        gender VARCHAR(50),
        notes TEXT,
        emergency_contact JSONB,
        status VARCHAR(50) DEFAULT 'active',
        member_type VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        campus_id UUID REFERENCES campuses(id),
        leader_user_id UUID REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'active',
        default_call_time_offset INTEGER DEFAULT 60,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS team_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        requires_acceptance BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS team_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        member_type VARCHAR(50) DEFAULT 'active',
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'active',
        UNIQUE(volunteer_id, team_id)
      );

      CREATE TABLE IF NOT EXISTS volunteer_capabilities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
        team_role_id UUID REFERENCES team_roles(id) ON DELETE CASCADE,
        proficiency_level VARCHAR(50) DEFAULT 'competent',
        UNIQUE(volunteer_id, team_role_id)
      );

      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        event_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        campus_id UUID REFERENCES campuses(id),
        venue VARCHAR(255),
        event_type VARCHAR(100),
        description TEXT,
        recurrence_rule TEXT,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        session_date DATE,
        start_time TIME,
        end_time TIME,
        call_time TIME,
        service_lead_id UUID REFERENCES users(id),
        pre_service_notes TEXT,
        post_service_notes TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS flow_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        sequence_no INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        item_type VARCHAR(100),
        planned_start_time TIME,
        duration_minutes INTEGER,
        description TEXT,
        responsible_team_id UUID REFERENCES teams(id),
        notes TEXT,
        visibility VARCHAR(50) DEFAULT 'all',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS flow_item_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        flow_item_id UUID REFERENCES flow_items(id) ON DELETE CASCADE,
        volunteer_id UUID REFERENCES volunteers(id),
        team_role_id UUID REFERENCES team_roles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(flow_item_id, volunteer_id)
      );

      CREATE TABLE IF NOT EXISTS schedule_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        team_id UUID REFERENCES teams(id),
        team_role_id UUID REFERENCES team_roles(id),
        volunteer_id UUID REFERENCES volunteers(id),
        status VARCHAR(50) DEFAULT 'pending',
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        response_due_at TIMESTAMPTZ,
        responded_at TIMESTAMPTZ,
        decline_reason TEXT,
        decline_category VARCHAR(100),
        notes TEXT,
        UNIQUE(session_id, team_role_id, volunteer_id)
      );

      CREATE TABLE IF NOT EXISTS availability_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
        weekday INTEGER,
        is_available BOOLEAN DEFAULT true,
        start_time TIME,
        end_time TIME,
        max_services_per_month INTEGER
      );

      CREATE TABLE IF NOT EXISTS blocked_dates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        volunteer_id UUID REFERENCES volunteers(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        related_id UUID,
        related_type VARCHAR(100),
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id UUID,
        changes JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

migrate();
