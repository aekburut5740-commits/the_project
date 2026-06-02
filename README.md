# Nexus Client Portal

**A comprehensive client portal system for project management, tracking, and communication.**

## Overview

Nexus Client Portal provides clients with real-time visibility into their projects, including:
- 📊 Dashboard with project health & progress
- 📝 Milestone and task tracking
- 💬 Live feedback & UAT management
- 📄 Document vault with version control
- 🔔 Status updates & notifications
- 🐙 Git integration for developer activity
- 📈 Automated reporting

---

## Tech Stack

- **Frontend**: Next.js 16 (React 19)
- **Backend**: Elysia + Bun (TypeScript)
- **Database**: PostgreSQL with raw pg client
- **Auth**: JWT (Bun.password hashing)
- **Styling**: Tailwind CSS

---

## Project Structure

```
nexus-client-portal/
├── apps/
│   ├── web/                    ← Next.js frontend
│   │   ├── app/                ← Pages & routes
│   │   ├── src/
│   │   │   ├── components/     ← React components
│   │   │   ├── hooks/          ← Custom hooks (useAuth)
│   │   │   ├── services/       ← API client
│   │   │   ├── lib/            ← Utilities
│   │   │   └── types/          ← TypeScript types
│   │   └── package.json
│   │
│   └── backend/                ← Elysia + Bun backend
│       ├── sql/                ← Database migrations
│       │   └── 001_init_schema.sql
│       ├── src/
│       │   ├── lib/
│       │   │   ├── db.ts       ← pg Client connection
│       │   │   └── env.ts      ← Environment validation
│       │   └── server/
│       │       ├── index.ts    ← Main server
│       │       └── routes/     ← API endpoints
│       │           ├── auth.routes.ts
│       │           ├── projects.routes.ts
│       │           ├── milestones.routes.ts
│       │           ├── tasks.routes.ts
│       │           ├── feedback.routes.ts
│       │           ├── documents.routes.ts
│       │           ├── notifications.routes.ts
│       │           ├── git.routes.ts
│       │           └── reports.routes.ts
│       └── package.json
│
├── DATABASE_SCHEMA.md          ← Schema documentation
├── .env.example                ← Environment template
└── package.json                ← Workspace root
```

---

## 8 Core Modules

### 1. Authentication & Security
- User login/registration
- JWT token management
- Role-based access control (RBAC)
- Permission system

### 2. Dashboard & Project Health
- Project overview
- Progress indicators
- Team member view
- Project switcher

### 3. Milestone Tracking
- Milestones with status
- Task management
- Progress tracking
- Status history audit

### 4. Status & Notification
- Real-time status updates
- Notification preferences
- Email/SMS/Push notifications
- Daily digest

### 5. Live Feedback Center
- Submit feedback/bugs/requests
- Comment threads
- File attachments
- Priority & status tracking

### 6. Document Vault
- Store project documents
- Version control
- Access control
- Confidentiality flags

### 7. Git Pulse
- GitHub/GitLab/Bitbucket integration
- Commit tracking
- Branch monitoring
- Developer activity

### 8. Reporting & Summary
- Generate project reports
- Automated report scheduling
- Financial tracking
- Multiple report types

---

## Quick Start

### Prerequisites
- Bun >= 1.0
- PostgreSQL >= 12
- Node.js >= 18 (if needed)

### 1. Install Dependencies

```bash
bun install
```

### 2. Setup Database

```bash
# Copy environment template
cp .env.example apps/backend/.env

# Edit .env with your database credentials
# DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT

# Run database migration
cd apps/backend && bun run migrate
# Or manually:
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f sql/001_init_schema.sql
```

### 3. Configure Environment

```bash
# Backend env
echo 'JWT_SECRET=your-32-char-random-string' >> apps/backend/.env
echo 'PORT=4000' >> apps/backend/.env

# Frontend env
echo 'NEXT_PUBLIC_API_URL=http://localhost:4000' > apps/web/.env.local
```

### 4. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd apps/backend
bun run dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
bun run dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Health check: http://localhost:4000/health

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login & get JWT
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Milestones
- `GET /api/projects/:id/milestones` - List milestones
- `POST /api/projects/:id/milestones` - Create milestone
- `PUT /api/milestones/:id` - Update milestone
- `GET /api/milestones/:id/tasks` - Get tasks in milestone

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id/status` - Update task status
- `GET /api/tasks/:id/history` - Get status history

### Feedback
- `GET /api/projects/:id/feedback` - List feedback
- `POST /api/projects/:id/feedback` - Submit feedback
- `POST /api/feedback/:id/comments` - Comment on feedback
- `PATCH /api/feedback/:id/status` - Update feedback status

### Documents
- `GET /api/projects/:id/documents` - List documents
- `POST /api/projects/:id/documents` - Upload document
- `GET /api/documents/:id/versions` - Get document versions
- `GET /api/documents/:id/access` - Check access

### Notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/preferences` - Update preferences

### Git Integration
- `POST /api/projects/:id/git` - Connect Git repo
- `GET /api/projects/:id/commits` - Get commits
- `GET /api/projects/:id/branches` - Get branches

### Reports
- `GET /api/projects/:id/reports` - List reports
- `POST /api/projects/:id/reports/generate` - Generate report
- `POST /api/projects/:id/reports/schedule` - Setup schedule

### Health
- `GET /health` - Backend health check

---

## Database Connection

The backend uses environment-based PostgreSQL connection:

```env
DB_USER=your_user
DB_HOST=localhost
DB_NAME=the_project
DB_PASSWORD=your_password
DB_PORT=5432
```

Connection is established in `apps/backend/src/lib/db.ts`:

```typescript
import { Client } from 'pg'

const db = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
})
```

---

## Database Schema

All tables are defined in `apps/backend/sql/001_init_schema.sql`.

See **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** for:
- Complete table definitions
- Module-by-module explanation
- Relationships & ER diagram
- Indexing strategy
- Design decisions

---

## Authentication

### Registration
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123"
  }'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "user": { "id": 1, "email": "user@example.com" }
# }
```

### Using Token
```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Development

### Create New Route

1. Create file: `apps/backend/src/server/routes/feature.routes.ts`
2. Import in `apps/backend/src/server/index.ts`
3. Register with `registerFeatureRoutes(app)`

### Database Queries

Use raw SQL with pg client:

```typescript
import db from '@/lib/db'

const result = await db.query(
  'SELECT * FROM projects WHERE company_id = $1',
  [companyId]
)

const projects = result.rows
```

### Error Handling

Wrap queries in try-catch:

```typescript
try {
  const result = await db.query(...)
  return { data: result.rows }
} catch (error) {
  console.error('Query failed:', error)
  set.status = 500
  return { message: 'Internal server error' }
}
```

---

## Deployment

### Production Build

```bash
# Frontend
cd apps/web && bun run build

# Backend is TypeScript, runs directly with Bun
bun apps/backend/src/server/index.ts
```

### Environment Variables (Production)
Set all variables from `.env.example` in your production environment (e.g., Vercel, Railway, Docker, etc.)

### Database Setup
Run migration on production database:
```bash
psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f sql/001_init_schema.sql
```

---

## Troubleshooting

### Connection refused
- Check PostgreSQL is running: `psql -U postgres`
- Verify `DB_HOST`, `DB_PORT` in `.env`
- Ensure database `DB_NAME` exists: `createdb the_project`

### JWT errors
- Ensure `JWT_SECRET` is set (min 32 characters)
- Check token expiration: `exp: '7d'` in auth.routes.ts

### CORS errors
- Verify `FRONTEND_URL` in backend `.env`
- Check `NEXT_PUBLIC_API_URL` in frontend `.env`

---

## Contributing

1. Create feature branch
2. Implement changes
3. Test locally (both servers running)
4. Commit with clear messages
5. Create pull request

---

## Support

- 📚 [Database Schema](./DATABASE_SCHEMA.md)
- 📖 [Next.js Docs](https://nextjs.org/docs)
- 🦕 [Elysia Docs](https://elysiajs.com)
- 🐘 [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

**Version**: 1.0.0  
**Last Updated**: June 2024  
**Status**: Schema Ready → Backend Dev → Frontend Dev → Testing
