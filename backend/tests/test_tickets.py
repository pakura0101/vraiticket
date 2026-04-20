"""Tests for /api/v1/tickets endpoints: CRUD, assign, escalate, cancel, comments, rating."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import auth_headers, make_ticket, make_user
from app.models.ticket import TicketStatus, TicketPriority, TicketType
from app.models.user import UserRole

BASE = "/api/v1/tickets"


# ─────────────────────────────────────────────────────────────────────────────
# CREATE
# ─────────────────────────────────────────────────────────────────────────────

class TestCreateTicket:
    def test_client_can_create_ticket(self, client: TestClient, client_user):
        resp = client.post(BASE + "/", json={
            "title": "My issue",
            "description": "Something broke",
            "priority": "MEDIUM",
            "ticket_type": "standard",
        }, headers=auth_headers(client_user))
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "My issue"
        assert data["status"] == "NEW"

    def test_agent_can_create_internal_ticket(self, client: TestClient, agent_user):
        resp = client.post(BASE + "/", json={
            "title": "Internal task",
            "description": "Agent internal work",
            "priority": "LOW",
            "ticket_type": "internal",
        }, headers=auth_headers(agent_user))
        assert resp.status_code == 201
        assert resp.json()["ticket_type"] == "internal"

    def test_client_cannot_create_internal_ticket(self, client: TestClient, client_user):
        resp = client.post(BASE + "/", json={
            "title": "Internal",
            "description": "...",
            "priority": "LOW",
            "ticket_type": "internal",
        }, headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self, client: TestClient):
        resp = client.post(BASE + "/", json={
            "title": "X", "description": "Y", "priority": "LOW", "ticket_type": "standard",
        })
        assert resp.status_code == 401

    def test_missing_required_fields_returns_422(self, client: TestClient, client_user):
        resp = client.post(BASE + "/", json={"title": "Only title"},
                           headers=auth_headers(client_user))
        assert resp.status_code == 422

    def test_created_ticket_has_due_at(self, client: TestClient, client_user):
        resp = client.post(BASE + "/", json={
            "title": "SLA test", "description": "check due_at",
            "priority": "HIGH", "ticket_type": "standard",
        }, headers=auth_headers(client_user))
        assert resp.status_code == 201
        assert resp.json()["due_at"] is not None


# ─────────────────────────────────────────────────────────────────────────────
# LIST
# ─────────────────────────────────────────────────────────────────────────────

class TestListTickets:
    def test_client_sees_only_own_tickets(self, client: TestClient, db: Session,
                                           client_user, second_client):
        make_ticket(db, client_user)
        make_ticket(db, second_client)
        resp = client.get(BASE + "/", headers=auth_headers(client_user))
        assert resp.status_code == 200
        for t in resp.json()["items"]:
            assert t["created_by"] == client_user.id

    def test_admin_sees_all_tickets(self, client: TestClient, db: Session,
                                     admin_user, client_user, second_client):
        make_ticket(db, client_user)
        make_ticket(db, second_client)
        resp = client.get(BASE + "/", headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["total"] >= 2

    def test_filter_by_status(self, client: TestClient, db: Session, admin_user, client_user):
        make_ticket(db, client_user, status=TicketStatus.NEW)
        make_ticket(db, client_user, status=TicketStatus.RESOLVED)
        resp = client.get(BASE + "/?status=NEW", headers=auth_headers(admin_user))
        for t in resp.json()["items"]:
            assert t["status"] == "NEW"

    def test_filter_by_priority(self, client: TestClient, db: Session, admin_user, client_user):
        make_ticket(db, client_user, priority=TicketPriority.HIGH)
        resp = client.get(BASE + "/?priority=HIGH", headers=auth_headers(admin_user))
        for t in resp.json()["items"]:
            assert t["priority"] == "HIGH"

    def test_pagination(self, client: TestClient, db: Session, admin_user, client_user):
        for _ in range(5):
            make_ticket(db, client_user)
        resp = client.get(BASE + "/?page=1&page_size=2", headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert len(resp.json()["items"]) <= 2

    def test_agent_sees_tickets_in_their_group(self, client: TestClient, db: Session,
                                                agent_user, client_user, group):
        agent_user.groups.append(group)
        db.flush()
        ticket = make_ticket(db, client_user, group_id=group.id)
        resp = client.get(BASE + "/", headers=auth_headers(agent_user))
        ids = [t["id"] for t in resp.json()["items"]]
        assert ticket.id in ids


# ─────────────────────────────────────────────────────────────────────────────
# GET SINGLE
# ─────────────────────────────────────────────────────────────────────────────

class TestGetTicket:
    def test_client_can_get_own_ticket(self, client: TestClient, ticket, client_user):
        resp = client.get(f"{BASE}/{ticket.id}", headers=auth_headers(client_user))
        assert resp.status_code == 200
        assert resp.json()["id"] == ticket.id

    def test_admin_can_get_any_ticket(self, client: TestClient, ticket, admin_user):
        resp = client.get(f"{BASE}/{ticket.id}", headers=auth_headers(admin_user))
        assert resp.status_code == 200

    def test_other_client_cannot_get_ticket(self, client: TestClient, ticket, second_client):
        resp = client.get(f"{BASE}/{ticket.id}", headers=auth_headers(second_client))
        assert resp.status_code == 403

    def test_nonexistent_ticket_returns_404(self, client: TestClient, admin_user):
        resp = client.get(f"{BASE}/999999", headers=auth_headers(admin_user))
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# UPDATE
# ─────────────────────────────────────────────────────────────────────────────

class TestUpdateTicket:
    def test_admin_can_update_status(self, client: TestClient, ticket, admin_user):
        resp = client.patch(f"{BASE}/{ticket.id}",
                            json={"status": "IN_PROGRESS"},
                            headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["status"] == "IN_PROGRESS"

    def test_assigned_agent_can_update(self, client: TestClient, db: Session,
                                        client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        resp = client.patch(f"{BASE}/{t.id}",
                            json={"status": "IN_PROGRESS"},
                            headers=auth_headers(agent_user))
        assert resp.status_code == 200

    def test_agent_cannot_change_assignment_via_update(self, client: TestClient, db: Session,
                                                         client_user, agent_user, second_agent):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        resp = client.patch(f"{BASE}/{t.id}",
                            json={"assigned_to": second_agent.id},
                            headers=auth_headers(agent_user))
        assert resp.status_code == 403

    def test_client_cannot_update_ticket(self, client: TestClient, ticket, client_user):
        resp = client.patch(f"{BASE}/{ticket.id}",
                            json={"status": "IN_PROGRESS"},
                            headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_resolve_sets_resolved_at(self, client: TestClient, db: Session,
                                       client_user, admin_user):
        t = make_ticket(db, client_user)
        resp = client.patch(f"{BASE}/{t.id}",
                            json={"status": "RESOLVED"},
                            headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert resp.json()["resolved_at"] is not None


# ─────────────────────────────────────────────────────────────────────────────
# SELF-ASSIGN
# ─────────────────────────────────────────────────────────────────────────────

class TestSelfAssign:
    def test_agent_can_self_assign_unassigned_ticket(self, client: TestClient,
                                                      db: Session, client_user, agent_user):
        t = make_ticket(db, client_user)
        resp = client.post(f"{BASE}/{t.id}/assign", headers=auth_headers(agent_user))
        assert resp.status_code == 200
        data = resp.json()
        assert data["assigned_to"] == agent_user.id
        assert data["status"] == "ASSIGNED"

    def test_client_cannot_self_assign(self, client: TestClient, ticket, client_user):
        resp = client.post(f"{BASE}/{ticket.id}/assign", headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_agent_outside_group_cannot_self_assign(self, client: TestClient,
                                                      db: Session, client_user, agent_user, group):
        t = make_ticket(db, client_user, group_id=group.id)
        # agent_user is NOT in the group
        resp = client.post(f"{BASE}/{t.id}/assign", headers=auth_headers(agent_user))
        assert resp.status_code == 403

    def test_cannot_assign_resolved_ticket(self, client: TestClient, db: Session,
                                            client_user, agent_user):
        t = make_ticket(db, client_user, status=TicketStatus.RESOLVED)
        resp = client.post(f"{BASE}/{t.id}/assign", headers=auth_headers(agent_user))
        assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# ESCALATE
# ─────────────────────────────────────────────────────────────────────────────

class TestEscalate:
    def test_agent_can_escalate_own_ticket(self, client: TestClient, db: Session,
                                            client_user, agent_user, second_agent):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        resp = client.post(f"{BASE}/{t.id}/escalate",
                           json={"target_agent_id": second_agent.id},
                           headers=auth_headers(agent_user))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ESCALATED"
        assert data["assigned_to"] == second_agent.id

    def test_agent_cannot_escalate_unowned_ticket(self, client: TestClient, db: Session,
                                                    client_user, agent_user, second_agent):
        t = make_ticket(db, client_user, assigned_to=second_agent.id, status=TicketStatus.ASSIGNED)
        resp = client.post(f"{BASE}/{t.id}/escalate",
                           json={"target_agent_id": agent_user.id},
                           headers=auth_headers(agent_user))
        assert resp.status_code == 403

    def test_client_cannot_escalate(self, client: TestClient, ticket, client_user, second_agent):
        resp = client.post(f"{BASE}/{ticket.id}/escalate",
                           json={"target_agent_id": second_agent.id},
                           headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_escalate_to_nonexistent_agent_returns_404(self, client: TestClient, db: Session,
                                                         client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        resp = client.post(f"{BASE}/{t.id}/escalate",
                           json={"target_agent_id": 999999},
                           headers=auth_headers(agent_user))
        assert resp.status_code == 404

    def test_cannot_escalate_resolved_ticket(self, client: TestClient, db: Session,
                                              client_user, agent_user, second_agent):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.RESOLVED)
        resp = client.post(f"{BASE}/{t.id}/escalate",
                           json={"target_agent_id": second_agent.id},
                           headers=auth_headers(agent_user))
        assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# CANCEL
# ─────────────────────────────────────────────────────────────────────────────

class TestCancelTicket:
    def test_client_can_cancel_own_ticket(self, client: TestClient, ticket, client_user):
        resp = client.post(f"{BASE}/{ticket.id}/cancel", headers=auth_headers(client_user))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "CANCELLED"
        assert data["cancelled_at"] is not None

    def test_agent_cannot_cancel(self, client: TestClient, db: Session,
                                  client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        resp = client.post(f"{BASE}/{t.id}/cancel", headers=auth_headers(agent_user))
        assert resp.status_code == 403

    def test_client_cannot_cancel_other_clients_ticket(self, client: TestClient,
                                                         db: Session, client_user, second_client):
        t = make_ticket(db, second_client)
        resp = client.post(f"{BASE}/{t.id}/cancel", headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_cannot_cancel_resolved_ticket(self, client: TestClient, db: Session, client_user):
        t = make_ticket(db, client_user, status=TicketStatus.RESOLVED)
        resp = client.post(f"{BASE}/{t.id}/cancel", headers=auth_headers(client_user))
        assert resp.status_code == 400

    def test_cannot_cancel_already_cancelled(self, client: TestClient, db: Session, client_user):
        t = make_ticket(db, client_user, status=TicketStatus.CANCELLED)
        resp = client.post(f"{BASE}/{t.id}/cancel", headers=auth_headers(client_user))
        assert resp.status_code == 400

    def test_admin_can_cancel_any_ticket(self, client: TestClient, ticket, admin_user):
        resp = client.post(f"{BASE}/{ticket.id}/cancel", headers=auth_headers(admin_user))
        assert resp.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# COMMENTS
# ─────────────────────────────────────────────────────────────────────────────

class TestComments:
    def test_client_can_add_comment(self, client: TestClient, ticket, client_user):
        resp = client.post(f"{BASE}/{ticket.id}/comments",
                           json={"content": "Hello!", "is_internal": False},
                           headers=auth_headers(client_user))
        assert resp.status_code == 201
        assert resp.json()["content"] == "Hello!"

    def test_agent_can_add_internal_note(self, client: TestClient, db: Session,
                                          client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        resp = client.post(f"{BASE}/{t.id}/comments",
                           json={"content": "Internal note", "is_internal": True},
                           headers=auth_headers(agent_user))
        assert resp.status_code == 201

    def test_client_cannot_add_internal_note(self, client: TestClient, ticket, client_user):
        resp = client.post(f"{BASE}/{ticket.id}/comments",
                           json={"content": "sneaky internal", "is_internal": True},
                           headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_client_cannot_comment_on_other_ticket(self, client: TestClient, db: Session,
                                                     second_client, client_user):
        t = make_ticket(db, second_client)
        resp = client.post(f"{BASE}/{t.id}/comments",
                           json={"content": "Hi", "is_internal": False},
                           headers=auth_headers(client_user))
        assert resp.status_code == 403

    def test_client_does_not_see_internal_comments(self, client: TestClient, db: Session,
                                                     client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        # Agent posts internal note
        client.post(f"{BASE}/{t.id}/comments",
                    json={"content": "Agent only", "is_internal": True},
                    headers=auth_headers(agent_user))
        # Client lists comments
        resp = client.get(f"{BASE}/{t.id}/comments", headers=auth_headers(client_user))
        assert resp.status_code == 200
        for c in resp.json():
            assert c.get("is_internal") is False

    def test_list_comments_nonexistent_ticket_returns_404(self, client: TestClient, client_user):
        resp = client.get(f"{BASE}/999999/comments", headers=auth_headers(client_user))
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# RATING
# ─────────────────────────────────────────────────────────────────────────────

class TestRating:
    def _resolved_ticket(self, db: Session, client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.RESOLVED)
        return t

    def test_client_can_rate_resolved_ticket(self, client: TestClient, db: Session,
                                              client_user, agent_user):
        t = self._resolved_ticket(db, client_user, agent_user)
        resp = client.post(f"{BASE}/{t.id}/rate",
                           json={"score": 5, "feedback": "Excellent!"},
                           headers=auth_headers(client_user))
        assert resp.status_code == 201
        assert resp.json()["score"] == 5

    def test_cannot_rate_unresolved_ticket(self, client: TestClient, ticket, client_user):
        resp = client.post(f"{BASE}/{ticket.id}/rate",
                           json={"score": 4},
                           headers=auth_headers(client_user))
        assert resp.status_code == 400

    def test_cannot_rate_twice(self, client: TestClient, db: Session, client_user, agent_user):
        t = self._resolved_ticket(db, client_user, agent_user)
        client.post(f"{BASE}/{t.id}/rate", json={"score": 5}, headers=auth_headers(client_user))
        resp = client.post(f"{BASE}/{t.id}/rate", json={"score": 3}, headers=auth_headers(client_user))
        assert resp.status_code == 400

    def test_non_owner_cannot_rate(self, client: TestClient, db: Session,
                                    client_user, second_client, agent_user):
        t = self._resolved_ticket(db, client_user, agent_user)
        resp = client.post(f"{BASE}/{t.id}/rate",
                           json={"score": 2},
                           headers=auth_headers(second_client))
        assert resp.status_code == 403

    def test_agent_cannot_rate(self, client: TestClient, db: Session, client_user, agent_user):
        t = self._resolved_ticket(db, client_user, agent_user)
        resp = client.post(f"{BASE}/{t.id}/rate",
                           json={"score": 4},
                           headers=auth_headers(agent_user))
        assert resp.status_code == 403


# ─────────────────────────────────────────────────────────────────────────────
# LOGS
# ─────────────────────────────────────────────────────────────────────────────

class TestTicketLogs:
    def test_logs_returned_for_ticket(self, client: TestClient, ticket, admin_user):
        resp = client.get(f"{BASE}/{ticket.id}/logs", headers=auth_headers(admin_user))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_client_can_view_own_ticket_logs(self, client: TestClient, ticket, client_user):
        resp = client.get(f"{BASE}/{ticket.id}/logs", headers=auth_headers(client_user))
        assert resp.status_code == 200

    def test_other_client_cannot_view_logs(self, client: TestClient, ticket, second_client):
        resp = client.get(f"{BASE}/{ticket.id}/logs", headers=auth_headers(second_client))
        assert resp.status_code == 403
