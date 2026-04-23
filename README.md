<div align="center">

# 🎫 VraiTicket

**A production-ready IT helpdesk & ticket management system**

[![CI](https://github.com/pakura0101/vraiticket/actions/workflows/CI.yml/badge.svg)](https://github.com/pakura0101/vraiticket/actions)
[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [Configuration](#-configuration) · [API Docs](#-api-docs) · [Development](#-development)

</div>

---

## ✨ Features

- **Role-based access control** — three distinct roles: `client`, `agent`, and `admin`, each with precisely scoped permissions
- **Full ticket lifecycle** — create, assign, escalate, resolve, cancel, and rate tickets
- **SLA enforcement** — Celery beat task auto-escalates overdue tickets every 15 minutes and notifies admins
- **Audit log** — every status change, assignment, and escalation is recorded with actor, timestamp, and old/new values
- **Threaded comments** — clients, agents, and admins can discuss tickets in-thread
- **File attachments** — server-side MIME validation (not header-spoofable), 5 MB cap, per-ticket storage
- **Agent groups** — tickets can be routed to groups; agents see only their group's queue
- **Statistics dashboard** — per-agent performance, company-level metrics, and SLA compliance reporting
- **Dark / light theme** — persisted user preference across sessions
- **Docker Compose** — single command to run the full stack (Postgres, Redis, Celery, API, frontend, Nginx)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                   Nginx (port 80)               │
│  /        → Next.js  (frontend:3000)            │
│  /api/v1  → FastAPI  (api:8000)                 │
└─────────────────────────────────────────────────┘
         │                        │
┌────────┴──────────┐   ┌─────────┴──────────────┐
│   Next.js 14      │   │   FastAPI (Python 3.12) │
│   App Router      │   │   SQLAlchemy ORM        │
│   Tailwind CSS    │   │   Alembic migrations    │
│   Zustand auth    │   │   JWT authentication    │
│   Axios + types   │   │   Celery + Redis tasks  │
└───────────────────┘   └─────────────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │        PostgreSQL 16        │
                    └────────────────────────────┘
```

### Backend layout

```
backend/
├── app/
│   ├── api/v1/endpoints/   # Thin route handlers (auth, tickets, users, …)
│   ├── core/               # Config, security (JWT + bcrypt), dependencies
│   ├── db/                 # SQLAlchemy engine, session, seeder
│   ├── models/             # ORM models (User, Ticket, Comment, …)
│   ├── schemas/            # Pydantic request/response schemas
│   ├── services/           # All business logic lives here
│   ├── tasks/              # Celery tasks (SLA escalation)
│   └── utils/              # Notifications, pagination
├── alembic/                # Database migrations
└── tests/                  # Pytest suite (SQLite in-memory)
```

### Frontend layout

```
frontend/src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Protected layout — tickets, admin, dashboard
│   └── login/              # Public auth page
├── components/             # Reusable UI components
├── hooks/                  # useAuthStore (Zustand), useTheme
├── lib/                    # api.ts (Axios client), services.ts
└── types/                  # Shared TypeScript interfaces
```

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/) v2

### 1 — Clone

```bash
git clone https://github.com/pakura0101/vraiticket.git
cd vraiticket
```

### 2 — Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — fill in SECRET_KEY, FIRST_ADMIN_EMAIL, FIRST_ADMIN_PASSWORD,
# ALLOWED_ORIGINS, and any database overrides.

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit if your API is not on localhost:8000
```

> **Required variables with no defaults** (the app will refuse to start without them):
>
> | Variable | Description |
> |---|---|
> | `SECRET_KEY` | JWT signing key — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
> | `FIRST_ADMIN_EMAIL` | Email for the bootstrap admin account |
> | `FIRST_ADMIN_PASSWORD` | Password for the bootstrap admin account — change after first login |
> | `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins (e.g. `https://app.example.com`) |

### 3 — Start

```bash
docker compose up --build
```

The stack will:
1. Start Postgres and Redis
2. Run Alembic migrations
3. Seed the first admin account (one-time, skipped on subsequent starts)
4. Start the API, Celery worker, Celery beat scheduler, frontend, and Nginx

Open **http://localhost** and log in with your `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`.

---

## ⚙️ Configuration

All backend settings are loaded from environment variables (or `backend/.env`). See [`backend/.env.example`](backend/.env.example) for the full reference.

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `production` | Set to `development` locally to enable debug mode |
| `DEBUG` | `false` | Enables Swagger UI, verbose logging, and open CORS |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `SECRET_KEY` | **required** | JWT signing secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | JWT lifetime in minutes |
| `ALLOWED_ORIGINS` | **required** | Comma-separated CORS origins (ignored in DEBUG mode) |
| `DEFAULT_SLA_HOURS` | `24` | Hours before a ticket is auto-escalated |
| `FIRST_ADMIN_EMAIL` | **required** | Bootstrap admin email (used once at first boot) |
| `FIRST_ADMIN_PASSWORD` | **required** | Bootstrap admin password (used once at first boot) |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string |

---

## 📖 API Docs

Swagger UI is available at **`/docs`** when `DEBUG=true`. It is automatically hidden in production.

### Authentication

All protected endpoints require a `Bearer` token obtained from `POST /api/v1/auth/login`.

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "yourpassword"}'
```

> The login endpoint is rate-limited to **10 requests per minute per IP** to prevent brute-force attacks.

### Role permissions summary

| Action | Client | Agent | Admin |
|---|:---:|:---:|:---:|
| Create standard ticket | ✅ | ✅ | ✅ |
| Create internal ticket | ❌ | ✅ | ✅ |
| View own tickets | ✅ | — | ✅ |
| View group tickets | — | ✅ | ✅ |
| Self-assign ticket | — | ✅ | ✅ |
| Escalate to agent | — | ✅ | ✅ |
| Update ticket status | — | ✅ | ✅ |
| Cancel own ticket | ✅ | ❌ | ✅ |
| Rate resolved ticket | ✅ | — | — |
| Manage users/companies | — | — | ✅ |
| View statistics | — | — | ✅ |
| Filter by `assigned_to` | — | — | ✅ |

---

## 🛠 Development

### Backend (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-test.txt
# python-magic also requires the system library:
# Ubuntu/Debian:  sudo apt install libmagic1
# macOS:          brew install libmagic

cp .env.example .env  # fill in values, set DEBUG=true

# Run migrations
alembic upgrade head

# Start API
uvicorn app.main:app --reload

# Start Celery worker (separate terminal)
celery -A app.tasks.celery_app worker --loglevel=info

# Start Celery beat scheduler (separate terminal)
celery -A app.tasks.celery_app beat --loglevel=info
```

### Frontend (without Docker)

```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL
npm run dev
```

### Running tests

```bash
cd backend
pytest -q --cov=app --cov-report=term-missing
```

Tests use an SQLite in-memory database — no external services required.

### Linting

```bash
# Backend
pip install ruff && ruff check .

# Frontend
npm run lint
npm run type-check
```

---

## 🔐 Security Notes

- **Passwords** are hashed with bcrypt (cost factor 12).
- **JWT tokens** are signed with HS256 and expire after `ACCESS_TOKEN_EXPIRE_MINUTES` minutes.
- **MIME type detection** uses `python-magic` to inspect actual file bytes, not the client-supplied `Content-Type` header.
- **CORS** is locked to `ALLOWED_ORIGINS` in production; open only in `DEBUG` mode.
- **Swagger UI** (`/docs`, `/redoc`) is disabled in production (`DEBUG=false`).
- **Rate limiting** on `POST /auth/login`: 10 requests/minute per IP (via slowapi).
- **No default credentials** — `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` are required at boot with no fallback values.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push and open a pull request against `main`

The CI pipeline will automatically run linting, type checks, tests, and Docker builds on every PR.

---

## 📄 License

[MIT](LICENSE) — © VraiTicket contributors
