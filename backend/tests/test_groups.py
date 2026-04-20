"""Tests for /api/v1/groups endpoints and GroupService."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import auth_headers, make_user
from app.models.user import UserRole
from app.models.group import Group
from app.core.exceptions import ConflictError, NotFoundError
from app.services.group_service import GroupService
from app.schemas.group import GroupCreate, GroupUpdate

BASE = "/api/v1/groups"


# ─────────────────────────────────────────────────────────────────────────────
# HTTP layer
# ─────────────────────────────────────────────────────────────────────────────

class TestCreateGroup:
    def test_admin_can_create_group(self, client: TestClient, admin_user):
        resp = client.post(BASE + "/", json={"name": "Level 1 Support"},
                           headers=auth_headers(admin_user))
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Level 1 Support"
        assert "id" in data

    def test_create_group_with_members(self, client: TestClient, admin_user, agent_user):
        resp = client.post(BASE + "/", json={
            "name": "VIP Support",
            "member_ids": [agent_user.id],
        }, headers=auth_headers(admin_user))
        assert resp.status_code == 201
        members = resp.json()["members"]
        assert any(m["id"] == agent_user.id for m in members)

    def test_client_ids_are_silently_ignored(self, client: TestClient, admin_user, client_user):
        """Clients are not agents — they should not end up as group members."""
        resp = client.post(BASE + "/", json={
            "name": "Filtered Group",
            "member_ids": [client_user.id],
        }, headers=auth_headers(admin_user))
        assert resp.status_code == 201
        # client_user is not an agent → _fetch_agents returns []
        assert resp.json()["members"] == []

    def test_duplicate_name_returns_409(self, client: TestClient, admin_user, group):
        resp = client.post(BASE + "/", json={"name": "Support L1"},
                           headers=auth_headers(admin_user))
        assert resp.status_code == 409

    def test_non_admin_cannot_create_group(self, client: TestClient, agent_user):
        resp = client.post(BASE + "/", json={"name": "Agent Group"},
                           headers=auth_headers(agent_user))
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client: TestClient):
        resp = client.post(BASE + "/", json={"name": "No Auth"})
        assert resp.status_code == 401


class TestListGroups:
    def test_any_authenticated_user_can_list(self, client: TestClient, client_user, group):
        resp = client.get(BASE + "/", headers=auth_headers(client_user))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_inactive_groups_not_listed(self, client: TestClient, admin_user, db: Session):
        g = Group(name="Inactive Group", is_active=False)
        db.add(g)
        db.flush()
        resp = client.get(BASE + "/", headers=auth_headers(admin_user))
        names = [g["name"] for g in resp.json()]
        assert "Inactive Group" not in names

    def test_unauthenticated_returns_401(self, client: TestClient):
        resp = client.get(BASE + "/")
        assert resp.status_code == 401


class TestGetGroup:
    def test_get_existing_group(self, client: TestClient, client_user, group):
        resp = client.get(f"{BASE}/{group.id}", headers=auth_headers(client_user))
        assert resp.status_code == 200
        assert resp.json()["id"] == group.id
        assert resp.json()["name"] == "Support L1"

    def test_nonexistent_group_returns_404(self, client: TestClient, client_user):
        resp = client.get(f"{BASE}/999999", headers=auth_headers(client_user))
        assert resp.status_code == 404


class TestUpdateGroup:
    def test_admin_can_update_group_name(self, client: TestClient, admin_user, group):
        resp = client.patch(f"{BASE}/{group.id}",
                            json={"name": "Renamed Group"},
                            headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Group"

    def test_admin_can_update_members(self, client: TestClient, admin_user, group, agent_user):
        resp = client.patch(f"{BASE}/{group.id}",
                            json={"member_ids": [agent_user.id]},
                            headers=auth_headers(admin_user))
        assert resp.status_code == 200
        member_ids = [m["id"] for m in resp.json()["members"]]
        assert agent_user.id in member_ids

    def test_admin_can_deactivate_group(self, client: TestClient, admin_user, group):
        resp = client.patch(f"{BASE}/{group.id}",
                            json={"is_active": False},
                            headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_non_admin_cannot_update_group(self, client: TestClient, agent_user, group):
        resp = client.patch(f"{BASE}/{group.id}",
                            json={"name": "Hacked"},
                            headers=auth_headers(agent_user))
        assert resp.status_code == 403

    def test_update_nonexistent_group_returns_404(self, client: TestClient, admin_user):
        resp = client.patch(f"{BASE}/999999", json={"name": "Ghost"},
                            headers=auth_headers(admin_user))
        assert resp.status_code == 404


class TestDeleteGroup:
    def test_admin_can_delete_group(self, client: TestClient, admin_user, db: Session):
        g = Group(name="To Be Deleted")
        db.add(g)
        db.flush()
        resp = client.delete(f"{BASE}/{g.id}", headers=auth_headers(admin_user))
        assert resp.status_code == 204

    def test_delete_nonexistent_returns_404(self, client: TestClient, admin_user):
        resp = client.delete(f"{BASE}/999999", headers=auth_headers(admin_user))
        assert resp.status_code == 404

    def test_non_admin_cannot_delete(self, client: TestClient, client_user, group):
        resp = client.delete(f"{BASE}/{group.id}", headers=auth_headers(client_user))
        assert resp.status_code == 403


# ─────────────────────────────────────────────────────────────────────────────
# Service layer
# ─────────────────────────────────────────────────────────────────────────────

class TestGroupService:
    def test_create_group(self, db: Session):
        svc = GroupService(db)
        g = svc.create(GroupCreate(name="Svc Group"))
        assert g.id is not None
        assert g.name == "Svc Group"

    def test_duplicate_name_raises(self, db: Session):
        svc = GroupService(db)
        svc.create(GroupCreate(name="Dup Group"))
        with pytest.raises(ConflictError):
            svc.create(GroupCreate(name="Dup Group"))

    def test_get_by_id_not_found(self, db: Session):
        with pytest.raises(NotFoundError):
            GroupService(db).get_by_id(999999)

    def test_list_groups_active_only(self, db: Session):
        svc = GroupService(db)
        active = Group(name="Active Svc", is_active=True)
        inactive = Group(name="Inactive Svc", is_active=False)
        db.add_all([active, inactive])
        db.flush()
        groups = svc.list_groups(active_only=True)
        names = [g.name for g in groups]
        assert "Active Svc" in names
        assert "Inactive Svc" not in names

    def test_list_groups_all(self, db: Session):
        svc = GroupService(db)
        inactive = Group(name="Also Inactive", is_active=False)
        db.add(inactive)
        db.flush()
        groups = svc.list_groups(active_only=False)
        names = [g.name for g in groups]
        assert "Also Inactive" in names

    def test_update_group(self, db: Session):
        svc = GroupService(db)
        g = svc.create(GroupCreate(name="Old Name"))
        updated = svc.update(g.id, GroupUpdate(name="New Name"))
        assert updated.name == "New Name"

    def test_update_group_members(self, db: Session, agent_user):
        svc = GroupService(db)
        g = svc.create(GroupCreate(name="Member Group"))
        updated = svc.update(g.id, GroupUpdate(member_ids=[agent_user.id]))
        assert any(m.id == agent_user.id for m in updated.members)

    def test_delete_group(self, db: Session):
        svc = GroupService(db)
        g = svc.create(GroupCreate(name="Deletable"))
        svc.delete(g.id)
        with pytest.raises(NotFoundError):
            svc.get_by_id(g.id)

    def test_fetch_agents_filters_out_clients(self, db: Session, client_user, agent_user):
        """_fetch_agents should only return users with agent role."""
        svc = GroupService(db)
        g = svc.create(GroupCreate(
            name="Mixed Members",
            member_ids=[client_user.id, agent_user.id]
        ))
        member_ids = [m.id for m in g.members]
        assert agent_user.id in member_ids
        assert client_user.id not in member_ids
