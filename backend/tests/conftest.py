"""
Shared pytest fixtures for the VraiTicket test suite.
Uses SQLite in-memory — no external services required.
"""
import os
import sys
import pytest
from contextlib import asynccontextmanager

# 1. Env vars BEFORE any app import
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ.setdefault("FIRST_ADMIN_EMAIL", "testadmin@vraiticket.io")
os.environ.setdefault("FIRST_ADMIN_PASSWORD", "TestAdmin@12345")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("CELERY_BROKER_URL", "redis://localhost:6379/0")
os.environ.setdefault("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

import unittest.mock as mock
from sqlalchemy import create_engine as _real_create_engine
from sqlalchemy.orm import sessionmaker, Session

# 2. Create shared test engine
_TEST_ENGINE = _real_create_engine(
    "sqlite:///./test.db",       # file-based so commits work properly
    connect_args={"check_same_thread": False},
)
_TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=_TEST_ENGINE)

# 3. Patch create_engine for app/db/base.py (which passes postgres-only kwargs)
def _sqlite_engine_factory(url, **kwargs):
    kwargs.pop("pool_size", None)
    kwargs.pop("max_overflow", None)
    kwargs["connect_args"] = {"check_same_thread": False}
    return _real_create_engine("sqlite:///./test.db", **kwargs)

with mock.patch("sqlalchemy.create_engine", side_effect=_sqlite_engine_factory):
    for mod in list(sys.modules):
        if mod.startswith("app."):
            del sys.modules[mod]
    import app.db.base as _db_base
    from app.db.session import get_db

_db_base.engine = _TEST_ENGINE
_db_base.SessionLocal = _TestingSession

# 4. Replace the lifespan with a no-op so seed_admin is never called
@asynccontextmanager
async def _noop_lifespan(app_instance):
    yield

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from app.api.v1.router import router as _api_router  # noqa: E402
from app.core.config import settings as _settings  # noqa: E402

app = FastAPI(title=_settings.APP_NAME, version="1.0.0", lifespan=_noop_lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)
app.include_router(_api_router)

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "app": _settings.APP_NAME}

from app.db.base import Base  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.models.company import Company  # noqa: E402
from app.models.group import Group  # noqa: E402
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketType  # noqa: E402
from app.core.security import hash_password, create_access_token  # noqa: E402

# 5. Create tables once
Base.metadata.create_all(bind=_TEST_ENGINE)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _clean_tables():
    """Truncate all tables before each test."""
    session = _TestingSession()
    try:
        # Delete in FK-safe order
        from app.models.rating import Rating
        from app.models.comment import Comment
        from app.models.ticket_log import TicketLog
        from app.models.attachment import Attachment
        from app.models.ticket import Ticket as _T
        from app.models.group import Group as _G, group_members
        session.execute(group_members.delete())
        session.query(Rating).delete()
        session.query(Comment).delete()
        session.query(TicketLog).delete()
        session.query(Attachment).delete()
        session.query(_T).delete()
        session.query(_G).delete()
        session.query(Company).delete()
        session.query(User).delete()
        session.commit()
    finally:
        session.close()
    yield


@pytest.fixture()
def db() -> Session:
    session = _TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db: Session):
    from fastapi.testclient import TestClient

    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_user(db: Session, email: str, role: UserRole, **kwargs) -> User:
    user = User(
        email=email,
        full_name=kwargs.get("full_name", f"Test {role.value.title()}"),
        hashed_password=hash_password(kwargs.get("password", "Password123")),
        role=role,
        is_active=kwargs.get("is_active", True),
        company_id=kwargs.get("company_id"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def auth_headers(user: User) -> dict:
    token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role.value, "email": user.email},
    )
    return {"Authorization": f"Bearer {token}"}


def make_ticket(db: Session, creator: User, *, status=TicketStatus.NEW,
                assigned_to=None, group_id=None, company_id=None,
                priority=TicketPriority.MEDIUM, ticket_type=TicketType.standard) -> Ticket:
    from datetime import datetime, timedelta, timezone
    t = Ticket(
        title="Test Ticket", description="Needs help",
        status=status, priority=priority, ticket_type=ticket_type,
        created_by=creator.id, assigned_to=assigned_to,
        group_id=group_id, company_id=company_id or creator.company_id,
        due_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


# ─── User fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture()
def admin_user(db):
    return make_user(db, "admin@test.com", UserRole.admin)

@pytest.fixture()
def agent_user(db):
    return make_user(db, "agent@test.com", UserRole.agent)

@pytest.fixture()
def client_user(db):
    return make_user(db, "client@test.com", UserRole.client)

@pytest.fixture()
def second_agent(db):
    return make_user(db, "agent2@test.com", UserRole.agent)

@pytest.fixture()
def second_client(db):
    return make_user(db, "client2@test.com", UserRole.client)

@pytest.fixture()
def company(db):
    c = Company(name="Acme Corp", domain="acme.com")
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@pytest.fixture()
def group(db):
    g = Group(name="Support L1")
    db.add(g)
    db.commit()
    db.refresh(g)
    return g

@pytest.fixture()
def ticket(db, client_user):
    return make_ticket(db, client_user)
