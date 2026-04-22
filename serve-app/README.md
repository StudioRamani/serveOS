# Serve — Church Volunteer Scheduling Platform

A full-stack church volunteer scheduling web app built with React, Node/Express, and PostgreSQL.

---

## Architecture

```
serve-app/
├── client/          # React frontend
│   └── src/
│       ├── pages/           # All page components
│       ├── components/      # Reusable components
│       ├── context/         # Auth context
│       ├── utils/api.js     # Axios API service layer
│       └── styles/global.css
└── server/          # Node/Express backend
    ├── routes/      # API route handlers
    ├── db/          # Pool, migration, seed
    └── middleware/  # JWT auth middleware
```

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally

### 2. Database Setup

```bash
createdb serve_app
```

### 3. Install Dependencies

```bash
# From project root
npm run install:all
```

### 4. Configure Environment

```bash
cd server
cp .env.example .env
# Edit .env and set your DB credentials and a JWT secret
```

### 5. Run Migrations & Seed

```bash
cd server
npm run db:migrate
npm run db:seed
```

### 6. Start Development Servers

```bash
# From project root — starts both client and server
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## Demo Credentials

| Role         | Email                | Password     |
|--------------|----------------------|--------------|
| Super Admin  | admin@church.org     | password123  |
| Team Leader  | sarah@church.org     | password123  |
| Volunteer    | john@church.org      | password123  |

---

## Features Implemented

### Authentication
- JWT-based login/logout
- Role-based access: Super Admin, Team Leader, Volunteer
- Protected routes per role

### Teams
- Create and manage ministry teams (Band, Singers, Ushers, etc.)
- Define roles within each team
- Add/remove members with team membership tracking

### Volunteers
- Full volunteer profiles with contact info
- Assign to multiple teams
- View service history and assignment status
- Blocked date management
- Search and filter

### Events & Sessions
- Calendar view and list view for events
- Create events with type, date, venue
- Add multiple sessions per event (e.g. First Service, Second Service)
- Call time tracking per session

### Session Planner (Core Feature)
**Order of Service tab:**
- Add flow items (prayer, worship, sermon, offering, etc.)
- Reorder with up/down arrows
- Assign responsible team and individual volunteers
- Display start times and durations
- Notes per item

**Schedule tab:**
- See all teams and roles for the session
- Assign volunteers to specific roles
- Conflict detection — checks if volunteer is already serving same day
- Visual status: accepted / pending / declined
- Remove assignments

**Overview tab:**
- Full order of service at a glance
- All teams and assigned volunteers
- Pre-service notes

### Volunteer Response Workflow
- Volunteers see pending assignments on dashboard
- Accept with one click
- Decline requires a reason + optional category
- Team leader notified on decline (via notifications system)

### Publish Workflow
- Sessions stay as draft until published
- Publishing sends in-app notifications to all assigned volunteers

### Dashboards
- **Admin:** Stats, upcoming events, pending responses, declined assignments
- **Volunteer:** Upcoming assignments with accept/decline action, session links

### Notifications
- In-app notification system
- Mark read / mark all read
- New assignment, decline alerts

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/register | Register |

### Teams
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/teams | List all teams |
| POST | /api/teams | Create team |
| GET | /api/teams/:id | Team detail with roles & members |
| PUT | /api/teams/:id | Update team |
| POST | /api/teams/:id/roles | Add role |
| DELETE | /api/teams/:id/roles/:roleId | Delete role |
| POST | /api/teams/:id/members | Add member |
| DELETE | /api/teams/:id/members/:volunteerId | Remove member |

### Volunteers
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/volunteers | List volunteers |
| POST | /api/volunteers | Create volunteer |
| GET | /api/volunteers/:id | Volunteer profile |
| PUT | /api/volunteers/:id | Update volunteer |
| POST | /api/volunteers/:id/blocked-dates | Add blocked date |

### Events & Sessions
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/events | List events |
| POST | /api/events | Create event |
| GET | /api/events/:id | Event with sessions |
| PUT | /api/events/:id | Update event |
| POST | /api/sessions | Create session |
| GET | /api/sessions/:id | Full session detail |
| PUT | /api/sessions/:id | Update session |
| POST | /api/sessions/:id/publish | Publish + notify |

### Scheduling
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/scheduling/session/:id | Session assignments |
| POST | /api/scheduling | Create assignment |
| PATCH | /api/scheduling/:id/respond | Accept/decline |
| DELETE | /api/scheduling/:id | Remove assignment |
| GET | /api/scheduling/conflict-check | Check volunteer conflicts |
| GET | /api/scheduling/suggest | Suggest volunteers |

### Flow
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/flow/session/:id | Get flow items |
| POST | /api/flow | Create flow item |
| PUT | /api/flow/:id | Update flow item |
| DELETE | /api/flow/:id | Delete flow item |
| POST | /api/flow/reorder | Reorder items |
| POST | /api/flow/:id/assign | Assign volunteer to item |

---

## Next Steps / Nice to Have

- [ ] WhatsApp/SMS/email notification integration (Twilio, SendGrid)
- [ ] Auto-rotation scheduling suggestions
- [ ] Song list integration for worship teams
- [ ] File attachments (sermon notes, stage plans)
- [ ] Multi-campus support
- [ ] Check-in on service day via QR code
- [ ] Mobile app (React Native)
- [ ] Report exports (PDF/CSV)
- [ ] Attendance vs scheduled comparison
- [ ] Google Calendar / iCal sync
