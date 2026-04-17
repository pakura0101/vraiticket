# VraiTicket — IT Support Ticket Management System

A modern, full-stack IT helpdesk platform built with **FastAPI** and **Next.js 14**. Three roles (client, agent, admin), real-time notifications, file attachments, agent performance analytics, light/dark theme, and a full Docker deployment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zustand · React Hook Form |
| Backend | FastAPI · Python 3.12 · SQLAlchemy 2 · Alembic · Pydantic v2 |
| Auth | JWT (python-jose) · bcrypt via passlib |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 · Celery 5 |
| Reverse Proxy | Nginx 1.27 |
| Container | Docker · Docker Compose |

---

## Repository Structure

```
vraiticket/                     ← root (this README)
├── docker-compose.yml          ← full stack orchestration
├── .env.example                ← copy to .env and fill in secrets
├── nginx/
│   └── nginx.conf              ← reverse proxy configuration
├── backend/                    ← FastAPI application
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/                ← database migrations
│   ├── app/
│   │   ├── api/v1/             ← route handlers
│   │   ├── core/               ← config, security, dependencies
│   │   ├── db/                 ← SQLAlchemy base, session, seed
│   │   ├── models/             ← ORM models
│   │   ├── schemas/            ← Pydantic request/response schemas
│   │   ├── services/           ← business logic layer
│   │   └── utils/              ← helpers, notifications, pagination
│   └── worker.py               ← Celery entry point
└── frontend/                   ← Next.js application
    ├── Dockerfile
    ├── next.config.js
    └── src/
        ├── app/                ← App Router pages
        ├── components/         ← UI, layout, ticket components
        ├── hooks/              ← Zustand stores, auth image hook
        ├── lib/                ← axios client, services, utils
        ├── styles/             ← globals.css with CSS variables
        └── types/              ← TypeScript interfaces
```

---

## Roles

| Role | Can do |
|---|---|
| **Client** | Submit tickets, track progress, upload attachments, rate resolved tickets, cancel own tickets |
| **Agent** | View group queue, self-assign tickets, update status, add internal notes, escalate to another agent, upload attachments |
| **Admin** | Everything above + manage users, companies, groups, view analytics, run SLA checks, assign tickets |

---

## Quick Start (Docker — recommended)

### Prerequisites
- Docker ≥ 24 and Docker Compose v2 (`docker compose version`)

### 1. Clone and configure

```bash
git clone https://github.com/your-org/vraiticket.git
cd vraiticket

# Create environment file from template
cp .env.example .env
```

Edit `.env` — at minimum change these three:

```dotenv
POSTGRES_PASSWORD=your_strong_db_password
SECRET_KEY=your_64_char_random_string     # python -c "import secrets; print(secrets.token_hex(64))"
FIRST_ADMIN_PASSWORD=YourAdminPassword1!
```

### 2. Build and start

```bash
docker compose up --build
```

On first run Docker will:
1. Start PostgreSQL and Redis
2. Run `alembic upgrade head` (creates all tables)
3. Seed the first admin account
4. Start the API, Celery worker, Next.js, and Nginx

### 3. Access

| Service | URL |
|---|---|
| **App** | http://localhost |
| **API docs** | http://localhost/docs |
| **Health check** | http://localhost/health |

**Default admin:** `admin@vraiticket.io` / `Admin@12345` *(change in `.env` before deploying)*

---

## Local Development (without Docker)

See individual READMEs:
- [`backend/README.md`](./backend/README.md) — Python venv setup
- [`frontend/README.md`](./frontend/README.md) — Node.js setup

---

## Architecture: Why Nginx as Reverse Proxy?

```
Browser
  │
  ▼
Nginx :80          (single entry point)
  ├── /api/*   → FastAPI :8000
  ├── /docs    → FastAPI :8000  (Swagger)
  ├── /health  → FastAPI :8000
  └── /*       → Next.js :3000
```

**Benefits over exposing ports directly:**

| | Without Nginx | With Nginx |
|---|---|---|
| CORS | Must configure `allow_origins` on every API response | Not needed — same origin `/api/v1` |
| Entry point | Two ports (`:3000` + `:8000`) | One port (`:80`) |
| SSL/TLS | Must configure on both services | Terminate once in Nginx |
| Rate limiting | Not built-in | Per-route limits (login: 5/min, API: 30/s) |
| Static assets | Served by Node.js | Nginx adds `Cache-Control: immutable` |
| Security headers | Must add in each app | Added once in Nginx config |

FastAPI and Next.js containers are **not exposed** to the host — they're only reachable through Nginx on the internal Docker network.

---

## Production Checklist

```bash
# Generate a strong secret key
python -c "import secrets; print(secrets.token_hex(64))"

# Required changes in .env before going live:
SECRET_KEY=<64-char random hex>
POSTGRES_PASSWORD=<strong password>
FIRST_ADMIN_PASSWORD=<strong password>

# In backend/app/main.py — tighten CORS (or remove — Nginx handles it):
allow_origins=["https://yourdomain.com"]

# For HTTPS: add certs to nginx/certs/ and uncomment the 443 block in nginx/nginx.conf
```

---

## Docker Services

| Service | Image | Role |
|---|---|---|
| `postgres` | postgres:16-alpine | Primary database |
| `redis` | redis:7-alpine | Celery broker + result store |
| `migrate` | (api image) | Runs `alembic upgrade head` once, then exits |
| `api` | Built from `backend/` | FastAPI application |
| `worker` | Built from `backend/` | Celery worker + beat scheduler (SLA escalation) |
| `frontend` | Built from `frontend/` | Next.js application |
| `nginx` | nginx:1.27-alpine | Reverse proxy, rate limiting, SSL termination |

### Useful commands

```bash
# Start in background
docker compose up -d --build

# View logs
docker compose logs -f api
docker compose logs -f worker
docker compose logs -f nginx

# Run a one-off migration
docker compose run --rm migrate alembic upgrade head

# Restart a single service
docker compose restart api

# Stop everything
docker compose down

# Stop and wipe all data (⚠ destructive)
docker compose down -v
```

---

## File Uploads

Uploaded files (ticket attachments and agent avatars) are stored in a Docker named volume `uploads` that is shared between the `api` and `worker` containers. The volume persists across container restarts. Files are served by the API with authentication — the frontend fetches them via axios with the Bearer token.

---

## License

MIT