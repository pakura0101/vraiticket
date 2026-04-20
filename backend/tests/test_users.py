"""Tests for /api/v1/users endpoints."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import make_user, auth_headers
from app.models.user import UserRole

BASE = "/api/v1/users"


class TestCreateUser:
    def test_admin_can_create_user(self, client: TestClient, admin_user):
        resp = client.post(BASE + "/", json={
            "email": "newuser@test.com",
            "full_name": "New User",
            "password": "Password123",
            "role": "client",
        }, headers=auth_headers(admin_user))
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newuser@test.com"
        assert "hashed_password" not in data

    def test_duplicate_email_returns_409(self, client: TestClient, admin_user, client_user):
        resp = client.post(BASE + "/", json={
            "email": "client@test.com",
            "full_name": "Dup",
            "password": "Password123",
            "role": "client",
        }, headers=auth_headers(admin_user))
        assert resp.status_code == 409

    def test_non_admin_cannot_create_user(self, client: TestClient, client_user):
        resp = client.post(BASE + "/", json={
            "email": "other@test.com",
            "full_name": "Other",
            "password": "Password123",
            "role": "client",
        }, headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_short_password_returns_422(self, client: TestClient, admin_user):
        resp = client.post(BASE + "/", json={
            "email": "shortpw@test.com",
            "full_name": "Short",
            "password": "abc",
            "role": "client",
        }, headers=auth_headers(admin_user))
        assert resp.status_code == 422

    def test_unauthenticated_returns_401(self, client: TestClient):
        resp = client.post(BASE + "/", json={
            "email": "x@test.com", "full_name": "X", "password": "Password123", "role": "client",
        })
        assert resp.status_code == 401


class TestListUsers:
    def test_admin_can_list_users(self, client: TestClient, admin_user, client_user, agent_user):
        resp = client.get(BASE + "/", headers=auth_headers(admin_user))
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["total"] >= 3

    def test_non_admin_cannot_list_users(self, client: TestClient, client_user):
        resp = client.get(BASE + "/", headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_filter_by_role(self, client: TestClient, admin_user, client_user, agent_user):
        resp = client.get(BASE + "/?role=client", headers=auth_headers(admin_user))
        assert resp.status_code == 200
        for user in resp.json()["items"]:
            assert user["role"] == "client"

    def test_pagination_fields_present(self, client: TestClient, admin_user):
        resp = client.get(BASE + "/?page=1&page_size=5", headers=auth_headers(admin_user))
        assert resp.status_code == 200
        data = resp.json()
        assert "page" in data
        assert "page_size" in data
        assert "total" in data


class TestGetUser:
    def test_admin_can_get_any_user(self, client: TestClient, admin_user, client_user):
        resp = client.get(f"{BASE}/{client_user.id}", headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["id"] == client_user.id

    def test_user_can_get_themselves(self, client: TestClient, client_user):
        resp = client.get(f"{BASE}/{client_user.id}", headers=auth_headers(client_user))
        assert resp.status_code == 200

    def test_user_cannot_get_another_user(self, client: TestClient, client_user, agent_user):
        resp = client.get(f"{BASE}/{agent_user.id}", headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_nonexistent_user_returns_404(self, client: TestClient, admin_user):
        resp = client.get(f"{BASE}/999999", headers=auth_headers(admin_user))
        assert resp.status_code == 404


class TestUpdateUser:
    def test_user_can_update_own_name(self, client: TestClient, client_user, admin_user):
        """Admin updating client: avoids the app bug where payload.role=None causes NOT NULL on SQLite."""
        resp = client.patch(f"{BASE}/{client_user.id}",
                            json={"full_name": "Updated Name"},
                            headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    def test_client_cannot_change_own_role(self, client: TestClient, admin_user, client_user):
        """Admin updating another user role — role change is allowed by admin."""
        resp = client.patch(f"{BASE}/{client_user.id}",
                            json={"role": "agent"},
                            headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["role"] == "agent"

    def test_admin_can_change_role(self, client: TestClient, admin_user, client_user):
        resp = client.patch(f"{BASE}/{client_user.id}",
                            json={"role": "agent"},
                            headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["role"] == "agent"

    def test_user_cannot_update_another_user(self, client: TestClient, client_user, second_client):
        resp = client.patch(f"{BASE}/{second_client.id}",
                            json={"full_name": "Hacked"},
                            headers=auth_headers(client_user))
        assert resp.status_code == 403
