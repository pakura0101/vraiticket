# VraiTicket — Backend API

Production-ready IT ticket management system built with **FastAPI**, **PostgreSQL**, **SQLAlchemy**, **Alembic**, and **Celery**.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Quick Start](#quick-start)
4. [Environment Variables](#environment-variables)
5. [Database Setup & Migrations](#database-setup--migrations)
6. [Running the API](#running-the-api)
7. [Running the Celery Worker (SLA)](#running-the-celery-worker-sla)
8. [API Reference](#api-reference)
9. [Roles & Permissions](#roles--permissions)
10. [SLA Logic](#sla-logic)
11. [Architecture Notes](#architecture-notes)

---

## Tech Stack

| Concern          | Technology                        |
|------------------|-----------------------------------|
| Framework        | FastAPI 0.111                     |
| Database         | PostgreSQL 15+                    |
| ORM              | SQLAlchemy 2.0 (mapped_column)    |
| Migrations       | Alembic 1.13                      |
| Validation       | Pydantic v2                       |
| Auth             | JWT via `python-jose` + bcrypt    |
| Background Jobs  | Celery 5 + Redis                  |
| Python           | 3.11+                             |

---

## Project Structure

```
vraiticket/
├── alembic/                   # Alembic migration environment
│   ├── env.py                 # Links models → Alembic autogenerate
│   ├── script.py.mako         # Migration file template
│   └── versions/              # Auto-generated migration files
├── app/
│   ├── main.py                # FastAPI app factory + lifespan
│   ├── api/
│   │   └── v1/
│   │       ├── router.py      # Assembles all routers under /api/v1
│   │       └── endpoints/
│   │           ├── auth.py        # POST /auth/login, GET /auth/me
│   │           ├── users.py       # User CRUD
│   │           ├── companies.py   # Company CRUD
│   │           ├── categories.py  # Category CRUD + smart assignment config
│   │           ├── tickets.py     # Ticket CRUD + comments + rating + logs
│   │           └── admin.py       # Stats dashboard + manual SLA trigger
│   ├── core/
│   │   ├── config.py          # Pydantic Settings (reads .env)
│   │   ├── security.py        # JWT encode/decode, bcrypt helpers
│   │   ├── dependencies.py    # get_current_user, require_role()
│   │   └── exceptions.py      # Typed HTTP exceptions
│   ├── db/
│   │   ├── base.py            # DeclarativeBase + engine + SessionLocal
│   │   ├── session.py         # get_db() FastAPI dependency
│   │   ├── init_db.py         # Seed first admin on startup
│   │   └── __init__.py        # Imports all models for Alembic discovery
│   ├── models/
│   │   ├── user.py            # User (client / agent / admin)
│   │   ├── company.py         # Company
│   │   ├── category.py        # Category + default_agent_id (smart assign)
│   │   ├── ticket.py          # Ticket + TicketStatus + TicketPriority
│   │   ├── comment.py         # Comment + is_internal flag
│   │   ├── ticket_log.py      # TicketLog (full audit trail)
│   │   └── rating.py          # Rating (1–5, per resolved ticket)
│   ├── schemas/
│   │   ├── auth.py            # LoginRequest, TokenResponse
│   │   ├── user.py            # UserCreate/Update/Read/Summary
│   │   ├── company.py
│   │   ├── category.py
│   │   ├── ticket.py          # TicketCreate/Update/Read/ListItem
│   │   ├── comment.py
│   │   ├── ticket_log.py      # TicketLogRead, RatingCreate/Read
│   │   ├── stats.py           # SystemStats, AgentStats
│   │   └── common.py          # PaginatedResponse[T]
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── category_service.py
│   │   ├── ticket_service.py  # Core logic: create, update, SLA escalation
│   │   ├── comment_service.py
│   │   ├── rating_service.py
│   │   └── stats_service.py
│   ├── tasks/
│   │   ├── celery_app.py      # Celery instance + beat schedule
│   │   └── sla.py             # check_sla_escalations task (every 15 min)
│   └── utils/
│       ├── notifications.py   # Simulated email notifications (logging)
│       └── pagination.py      # paginate() helper
├── worker.py                  # Celery CLI entry point
├── alembic.ini
├── requirements.txt
├── .env.example
└── README.md
```

---

## Quick Start

### 1. Clone and create a virtual environment

```bash
git clone https://github.com/your-org/vraiticket.git
cd vraiticket

python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and SECRET_KEY
```

### 3. Create the PostgreSQL database

```sql
-- Connect as superuser (psql)
CREATE USER vraiticket_user WITH PASSWORD 'strongpassword';
CREATE DATABASE vraiticket_db OWNER vraiticket_user;
GRANT ALL PRIVILEGES ON DATABASE vraiticket_db TO vraiticket_user;
```

### 4. Run migrations

```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

### 5. Start the API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The first admin account is seeded automatically on startup using `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` from `.env`.

Open the interactive docs at: **http://localhost:8000/docs**

---

## Environment Variables

| Variable                    | Required | Description                                      |
|-----------------------------|----------|--------------------------------------------------|
| `DATABASE_URL`              | ✅       | PostgreSQL DSN                                   |
| `SECRET_KEY`                | ✅       | 64-char random string for JWT signing            |
| `ALGORITHM`                 | —        | JWT algorithm (default: `HS256`)                 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | —      | Token lifetime (default: `60`)                   |
| `REDIS_URL`                 | —        | Redis URL for Celery (default: localhost)         |
| `CELERY_BROKER_URL`         | —        | Celery broker (default: Redis)                   |
| `CELERY_RESULT_BACKEND`     | —        | Celery result backend                            |
| `DEFAULT_SLA_HOURS`         | —        | Global SLA deadline in hours (default: `24`)     |
| `FIRST_ADMIN_EMAIL`         | —        | Seeded admin email                               |
| `FIRST_ADMIN_PASSWORD`      | —        | Seeded admin password                            |

Generate a secure `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(64))"
```

---

## Database Setup & Migrations

```bash
# Generate a new migration after model changes
alembic revision --autogenerate -m "describe your change"

# Apply all pending migrations
alembic upgrade head

# Downgrade one step
alembic downgrade -1

# View migration history
alembic history --verbose

# Check current revision
alembic current
```

---

## Running the API

**Development (auto-reload):**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Production (multiple workers):**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**With Gunicorn (recommended for production):**
```bash
pip install gunicorn
gunicorn app.main:app \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

---

## Running the Celery Worker (SLA)

Celery requires Redis. Make sure Redis is running, then:

**Worker:**
```bash
celery -A worker.celery_app worker --loglevel=info
```

**Beat scheduler** (triggers SLA check every 15 minutes):
```bash
celery -A worker.celery_app beat --loglevel=info
```

**Both together (development only):**
```bash
celery -A worker.celery_app worker --beat --loglevel=info
```

**Manual SLA trigger (no Celery needed):**
```http
POST /api/v1/admin/sla/check
Authorization: Bearer <admin_token>
```

---

## API Reference

All endpoints are prefixed with `/api/v1`. Interactive docs: `GET /docs`.

### Authentication

| Method | Path             | Description                  | Auth  |
|--------|------------------|------------------------------|-------|
| POST   | `/auth/login`    | Get JWT token                | —     |
| GET    | `/auth/me`       | Current user profile         | ✅    |

**Login example:**
```json
POST /api/v1/auth/login
{
  "email": "admin@vraiticket.io",
  "password": "Admin@12345"
}
```

### Users

| Method | Path           | Description             | Roles         |
|--------|----------------|-------------------------|---------------|
| POST   | `/users/`      | Create user             | admin         |
| GET    | `/users/`      | List users              | admin         |
| GET    | `/users/{id}`  | Get user by ID          | admin / self  |
| PATCH  | `/users/{id}`  | Update user             | admin / self  |

### Companies

| Method | Path               | Description        | Roles         |
|--------|--------------------|--------------------|---------------|
| POST   | `/companies/`      | Create company     | admin         |
| GET    | `/companies/`      | List companies     | admin / agent |
| GET    | `/companies/{id}`  | Get company        | any           |
| PATCH  | `/companies/{id}`  | Update company     | admin         |

### Categories

| Method | Path                | Description         | Roles  |
|--------|---------------------|---------------------|--------|
| POST   | `/categories/`      | Create category     | admin  |
| GET    | `/categories/`      | List categories     | any    |
| GET    | `/categories/{id}`  | Get category        | any    |
| PATCH  | `/categories/{id}`  | Update category     | admin  |

### Tickets

| Method | Path                        | Description                          | Roles              |
|--------|-----------------------------|--------------------------------------|--------------------|
| POST   | `/tickets/`                 | Create ticket                        | any                |
| GET    | `/tickets/`                 | List tickets (role-filtered)         | any                |
| GET    | `/tickets/{id}`             | Get ticket detail                    | owner/assignee/admin|
| PATCH  | `/tickets/{id}`             | Update ticket                        | agent / admin      |
| GET    | `/tickets/{id}/logs`        | Full audit trail                     | owner/assignee/admin|
| POST   | `/tickets/{id}/comments`    | Add comment or internal note         | any                |
| GET    | `/tickets/{id}/comments`    | List comments (internals hidden from clients) | any    |
| POST   | `/tickets/{id}/rate`        | Rate resolved ticket (1–5)           | client (owner only)|

**Create ticket example:**
```json
POST /api/v1/tickets/
Authorization: Bearer <token>
{
  "title": "Cannot login to VPN",
  "description": "Getting 401 error since this morning",
  "priority": "HIGH",
  "category_id": 2
}
```

**Update ticket status (agent):**
```json
PATCH /api/v1/tickets/42
Authorization: Bearer <agent_token>
{
  "status": "IN_PROGRESS"
}
```

**Add internal note:**
```json
POST /api/v1/tickets/42/comments
Authorization: Bearer <agent_token>
{
  "content": "Escalating to network team internally.",
  "is_internal": true
}
```

**Rate a ticket:**
```json
POST /api/v1/tickets/42/rate
Authorization: Bearer <client_token>
{
  "score": 5,
  "feedback": "Issue resolved very quickly, great support!"
}
```

### Admin

| Method | Path               | Description                        | Roles  |
|--------|--------------------|------------------------------------|--------|
| GET    | `/admin/stats`     | System-wide statistics             | admin  |
| POST   | `/admin/sla/check` | Manually trigger SLA escalation    | admin  |

---

## Roles & Permissions

| Action                         | client | agent | admin |
|--------------------------------|--------|-------|-------|
| Create ticket                  | ✅     | ✅    | ✅    |
| View own tickets               | ✅     | —     | ✅    |
| View assigned tickets          | —      | ✅    | ✅    |
| Update ticket (status, assign) | ❌     | ✅    | ✅    |
| Add comment                    | ✅     | ✅    | ✅    |
| Add internal note              | ❌     | ✅    | ✅    |
| See internal notes             | ❌     | ✅    | ✅    |
| Rate resolved ticket           | ✅     | ❌    | ❌    |
| Manage categories              | ❌     | ❌    | ✅    |
| Manage users                   | ❌     | ❌    | ✅    |
| View stats                     | ❌     | ❌    | ✅    |

---

## SLA Logic

1. **On ticket creation** — `due_at` is calculated as `now + sla_hours` where `sla_hours` comes from the category's `sla_hours` field, falling back to `DEFAULT_SLA_HOURS` from `.env`.

2. **Celery Beat** runs `check_sla_escalations` every **15 minutes**. Any ticket where:
   - `due_at < now`, AND
   - `status NOT IN (RESOLVED, CLOSED, ESCALATED)`

   …is automatically transitioned to `ESCALATED` and an audit log entry is written.

3. Admins can also trigger the check manually via `POST /admin/sla/check`.

4. Every escalation is **logged** in `ticket_logs` with `action=ESCALATED` and a **notification is simulated** in the application logs (replace `utils/notifications.py` with real SMTP/SendGrid when ready).

---

## Architecture Notes

- **Clean layered architecture**: `routes → services → models`. Routes handle HTTP concerns only; all business logic lives in services.
- **Role-based data visibility**: `TicketService.list_tickets()` automatically scopes results — clients see only their own tickets, agents see only their assigned tickets, admins see everything.
- **Audit trail**: Every status change, assignment, comment, and rating writes a `TicketLog` entry automatically inside the service layer.
- **Smart auto-assignment**: When a ticket is created in a category that has a `default_agent_id`, the ticket is automatically assigned and its status set to `ASSIGNED`.
- **Pagination**: All list endpoints return `PaginatedResponse[T]` with `items`, `total`, `page`, `page_size`, and `pages` — ready for Next.js infinite scroll or pagination components.
- **Next.js compatibility**: All responses are clean JSON. CORS is configured. Errors follow `{ "detail": "..." }` convention matching FastAPI's standard error format.
