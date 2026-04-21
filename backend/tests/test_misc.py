"""Miscellaneous tests: health check, RBAC helpers, pagination utility, schema validators."""
import pytest
from fastapi.testclient import TestClient

from tests.conftest import auth_headers, make_user
from app.models.user import UserRole
from app.utils.pagination import paginate
from app.core.exceptions import BadRequestError, NotFoundError, ForbiddenError, ConflictError


class TestHealth:
    def test_health_endpoint(self, client: TestClient):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
        assert "app" in resp.json()

    def test_health_no_auth_required(self, client: TestClient):
        # No Authorization header — should still pass
        resp = client.get("/health")
        assert resp.status_code == 200


class TestPagination:
    def test_paginate_first_page(self):
        items = list(range(10))
        result = paginate(items, total=50, page=1, page_size=10)
        assert result["page"] == 1
        assert result["page_size"] == 10
        assert result["total"] == 50
        assert result["items"] == items

    def test_paginate_second_page(self):
        items = list(range(10, 20))
        result = paginate(items, total=50, page=2, page_size=10)
        assert result["page"] == 2

    def test_paginate_empty(self):
        result = paginate([], total=0, page=1, page_size=20)
        assert result["total"] == 0
        assert result["items"] == []


class TestExceptions:
    def test_not_found_error_status(self):
        exc = NotFoundError("Widget")
        assert exc.status_code == 404
        assert "Widget" in exc.detail

    def test_forbidden_error_status(self):
        exc = ForbiddenError("Nope")
        assert exc.status_code == 403

    def test_bad_request_error_status(self):
        exc = BadRequestError("Invalid input")
        assert exc.status_code == 400

    def test_conflict_error_status(self):
        exc = ConflictError("Already exists")
        assert exc.status_code == 409


class TestRoleProtection:
    """Integration-level RBAC checks across endpoints."""

    def test_client_cannot_access_users_list(self, client: TestClient, client_user):
        resp = client.get("/api/v1/users/", headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_agent_cannot_access_users_list(self, client: TestClient, agent_user):
        resp = client.get("/api/v1/users/", headers=auth_headers(agent_user))
        assert resp.status_code == 403

    def test_unauth_cannot_access_companies(self, client: TestClient):
        resp = client.get("/api/v1/companies/")
        assert resp.status_code == 401

    def test_unauth_cannot_access_tickets(self, client: TestClient):
        resp = client.get("/api/v1/tickets/")
        assert resp.status_code == 401

    def test_invalid_token_format_returns_401(self, client: TestClient):
        resp = client.get("/api/v1/auth/me",
                          headers={"Authorization": "NotBearer token"})
        assert resp.status_code == 401


class TestSchemaValidation:
    """Test that Pydantic schemas reject bad input via the API."""

    def test_invalid_email_returns_422(self, client: TestClient, admin_user):
        resp = client.post("/api/v1/users/", json={
            "email": "not-an-email",
            "full_name": "Test",
            "password": "Password123",
            "role": "client",
        }, headers=auth_headers(admin_user))
        assert resp.status_code == 422

    def test_invalid_role_returns_422(self, client: TestClient, admin_user):
        resp = client.post("/api/v1/users/", json={
            "email": "valid@test.com",
            "full_name": "Test",
            "password": "Password123",
            "role": "superuser",   # not a valid role
        }, headers=auth_headers(admin_user))
        assert resp.status_code == 422

    def test_invalid_priority_returns_422(self, client: TestClient, client_user):
        resp = client.post("/api/v1/tickets/", json={
            "title": "T",
            "description": "D",
            "priority": "CRITICAL",   # not valid
            "ticket_type": "standard",
        }, headers=auth_headers(client_user))
        assert resp.status_code == 422

    def test_page_size_too_large_returns_422(self, client: TestClient, admin_user):
        resp = client.get("/api/v1/users/?page_size=9999", headers=auth_headers(admin_user))
        assert resp.status_code == 422

    def test_page_less_than_1_returns_422(self, client: TestClient, admin_user):
        resp = client.get("/api/v1/users/?page=0", headers=auth_headers(admin_user))
        assert resp.status_code == 422
