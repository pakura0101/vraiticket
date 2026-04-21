"""Tests for POST /api/v1/auth/login and GET /api/v1/auth/me."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import make_user, auth_headers
from app.models.user import UserRole


BASE = "/api/v1/auth"


class TestLogin:
    def test_successful_login_returns_token(self, client: TestClient, client_user):
        resp = client.post(f"{BASE}/login", json={"email": "client@test.com", "password": "Password123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_wrong_password_returns_400(self, client: TestClient, client_user):
        resp = client.post(f"{BASE}/login", json={"email": "client@test.com", "password": "wrong"})
        assert resp.status_code == 400

    def test_unknown_email_returns_400(self, client: TestClient):
        resp = client.post(f"{BASE}/login", json={"email": "nobody@test.com", "password": "Password123"})
        assert resp.status_code == 400

    def test_inactive_user_cannot_login(self, client: TestClient, db: Session):
        make_user(db, "inactive@test.com", UserRole.client, is_active=False)
        resp = client.post(f"{BASE}/login", json={"email": "inactive@test.com", "password": "Password123"})
        assert resp.status_code == 400

    def test_login_missing_fields_returns_422(self, client: TestClient):
        resp = client.post(f"{BASE}/login", json={"email": "only@email.com"})
        assert resp.status_code == 422


class TestMe:
    def test_me_returns_current_user(self, client: TestClient, client_user):
        resp = client.get(f"{BASE}/me", headers=auth_headers(client_user))
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "client@test.com"
        assert data["role"] == "client"

    def test_me_without_token_returns_401(self, client: TestClient):
        resp = client.get(f"{BASE}/me")
        assert resp.status_code == 401

    def test_me_with_invalid_token_returns_401(self, client: TestClient):
        resp = client.get(f"{BASE}/me", headers={"Authorization": "Bearer not-a-real-token"})
        assert resp.status_code == 401

    def test_admin_me_returns_admin_role(self, client: TestClient, admin_user):
        resp = client.get(f"{BASE}/me", headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["role"] == "admin"
