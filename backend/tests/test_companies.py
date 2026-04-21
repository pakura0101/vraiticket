"""Tests for /api/v1/companies endpoints."""
import pytest
from fastapi.testclient import TestClient

from tests.conftest import auth_headers

BASE = "/api/v1/companies"


class TestCreateCompany:
    def test_admin_creates_company(self, client: TestClient, admin_user):
        resp = client.post(BASE + "/", json={"name": "New Corp", "domain": "newcorp.com"},
                           headers=auth_headers(admin_user))
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "New Corp"
        assert data["domain"] == "newcorp.com"
        assert "id" in data

    def test_duplicate_name_returns_409(self, client: TestClient, admin_user, company):
        resp = client.post(BASE + "/", json={"name": "Acme Corp"},
                           headers=auth_headers(admin_user))
        assert resp.status_code == 409

    def test_non_admin_cannot_create(self, client: TestClient, client_user):
        resp = client.post(BASE + "/", json={"name": "X Corp"},
                           headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client: TestClient):
        resp = client.post(BASE + "/", json={"name": "Y Corp"})
        assert resp.status_code == 401


class TestListCompanies:
    def test_any_authenticated_user_can_list(self, client: TestClient, client_user, company):
        resp = client.get(BASE + "/", headers=auth_headers(client_user))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_only_active_companies_listed(self, client: TestClient, admin_user, db):
        from app.models.company import Company
        inactive = Company(name="Inactive Corp", is_active=False)
        db.add(inactive)
        db.flush()
        resp = client.get(BASE + "/", headers=auth_headers(admin_user))
        names = [c["name"] for c in resp.json()]
        assert "Inactive Corp" not in names

    def test_unauthenticated_returns_401(self, client: TestClient):
        resp = client.get(BASE + "/")
        assert resp.status_code == 401


class TestGetCompany:
    def test_get_existing_company(self, client: TestClient, client_user, company):
        resp = client.get(f"{BASE}/{company.id}", headers=auth_headers(client_user))
        assert resp.status_code == 200
        assert resp.json()["id"] == company.id

    def test_get_nonexistent_returns_404(self, client: TestClient, client_user):
        resp = client.get(f"{BASE}/999999", headers=auth_headers(client_user))
        assert resp.status_code == 404


class TestUpdateCompany:
    def test_admin_can_update(self, client: TestClient, admin_user, company):
        resp = client.patch(f"{BASE}/{company.id}",
                            json={"description": "Updated desc"},
                            headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated desc"

    def test_non_admin_cannot_update(self, client: TestClient, client_user, company):
        resp = client.patch(f"{BASE}/{company.id}",
                            json={"description": "Hacked"},
                            headers=auth_headers(client_user))
        assert resp.status_code == 403


class TestDeleteCompany:
    def test_admin_can_delete(self, client: TestClient, admin_user, db):
        from app.models.company import Company
        c = Company(name="To Delete")
        db.add(c)
        db.flush()
        resp = client.delete(f"{BASE}/{c.id}", headers=auth_headers(admin_user))
        assert resp.status_code == 204

    def test_delete_nonexistent_returns_404(self, client: TestClient, admin_user):
        resp = client.delete(f"{BASE}/999999", headers=auth_headers(admin_user))
        assert resp.status_code == 404

    def test_non_admin_cannot_delete(self, client: TestClient, client_user, company):
        resp = client.delete(f"{BASE}/{company.id}", headers=auth_headers(client_user))
        assert resp.status_code == 403
