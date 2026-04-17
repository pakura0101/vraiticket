# VraiTicket — Backend

FastAPI REST API for the VraiTicket IT support platform.

## Stack

- **Python 3.12** with FastAPI ≥ 0.115.5, Uvicorn 0.32.1
- **PostgreSQL 16** via SQLAlchemy ≥ 2.0.36 + Alembic ≥ 1.14.0
- **Redis 5.2.1** + **Celery 5.4.0** for background tasks (SLA escalation)
- **JWT** auth (python-jose 3.3.0) with bcrypt 4.0.1 password hashing
- **Pydantic v2** (≥ 2.10.3) + pydantic-settings ≥ 2.6.1 for validation and config
- **python-multipart 0.0.18** for file uploads
- **httpx 0.28.1** for internal HTTP calls
- **python-dotenv 1.0.1** for environment variable loading

## Project Structure

```
backend/
├── app/
│   ├── api/v1/endpoints/   ← auth, users, companies, groups, tickets, admin
│   ├── core/               ← config, security, dependencies, exceptions
│   ├── db/                 ← SQLAlchemy base, session, seed
│   ├── models/             ← ORM models (User, Ticket, Group, Company…)
│   ├── schemas/            ← Pydantic request/response schemas
│   ├── services/           ← Business logic layer
│   └── utils/              ← Notifications, pagination
├── alembic/                ← Database migrations
├── requirements.txt
├── worker.py               ← Celery app entry point
└── Dockerfile
```

## API Endpoints (summary)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | — | Get JWT token |
| `GET` | `/api/v1/auth/me` | ✓ | Current user |
| `GET/POST` | `/api/v1/tickets/` | ✓ | List / create tickets |
| `GET/PATCH` | `/api/v1/tickets/{id}` | ✓ | Detail / update ticket |
| `POST` | `/api/v1/tickets/{id}/assign` | agent/admin | Self-assign |
| `POST` | `/api/v1/tickets/{id}/escalate` | agent/admin | Transfer to another agent |
| `POST` | `/api/v1/tickets/{id}/cancel` | client/admin | Cancel |
| `POST` | `/api/v1/tickets/{id}/attachments` | ✓ | Upload file |
| `GET` | `/api/v1/tickets/{id}/attachments/{aid}/download` | ✓ | Download file |
| `POST` | `/api/v1/tickets/{id}/rate` | client | Rate resolved ticket |
| `GET/POST` | `/api/v1/users/` | admin | List / create users |
| `POST` | `/api/v1/users/{id}/avatar` | admin/self | Upload avatar photo |
| `GET` | `/api/v1/users/{id}/avatar` | ✓ | Serve avatar image |
| `GET/POST` | `/api/v1/groups/` | ✓/admin | List / create groups |
| `GET/POST` | `/api/v1/companies/` | ✓/admin | List / create companies |
| `GET` | `/api/v1/admin/stats` | admin | System statistics |
| `POST` | `/api/v1/admin/sla/check` | admin | Trigger SLA escalation |
| `GET` | `/health` | — | Liveness probe |

Full interactive docs at: `http://localhost:8000/docs`

## Local Development

### Prerequisites
- Python 3.12+, PostgreSQL 14+, Redis

```bash
cd backend

# Virtual environment
python -m venv .venv && source .venv/bin/activate

# Dependencies
pip install -r requirements.txt

# Environment
cp .env.example .env
# Edit .env — set DATABASE_URL and SECRET_KEY at minimum

# Create database
psql -U postgres -c "CREATE DATABASE vraiticket_db;"

# Run migrations
alembic upgrade head

# Start API
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A worker.celery_app worker --beat --loglevel=info
```

### Generate SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_hex(64))"
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✓ | — | PostgreSQL connection string |
| `SECRET_KEY` | ✓ | — | JWT signing key (64+ chars) |
| `REDIS_URL` | | `redis://localhost:6379/0` | Redis URL |
| `DEFAULT_SLA_HOURS` | | `24` | Default SLA deadline |
| `FIRST_ADMIN_EMAIL` | | `admin@vraiticket.io` | Seeded admin email |
| `FIRST_ADMIN_PASSWORD` | | `Admin@12345` | Seeded admin password |
