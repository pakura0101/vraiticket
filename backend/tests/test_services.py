"""Unit tests for service-layer logic (no HTTP layer, direct service calls)."""
import pytest
from sqlalchemy.orm import Session

from tests.conftest import make_user, make_ticket
from app.models.user import UserRole
from app.models.ticket import TicketStatus
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError, ConflictError
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.ticket_service import TicketService
from app.services.comment_service import CommentService
from app.services.rating_service import RatingService
from app.schemas.auth import LoginRequest
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.schemas.comment import CommentCreate
from app.schemas.ticket_log import RatingCreate


# ─────────────────────────────────────────────────────────────────────────────
# AuthService
# ─────────────────────────────────────────────────────────────────────────────

class TestAuthService:
    def test_login_returns_token(self, db: Session):
        make_user(db, "svc@test.com", UserRole.client, password="MyPass123")
        result = AuthService(db).login(LoginRequest(email="svc@test.com", password="MyPass123"))
        assert result.access_token
        assert result.token_type == "bearer"

    def test_wrong_password_raises(self, db: Session):
        make_user(db, "svc2@test.com", UserRole.client)
        with pytest.raises(BadRequestError):
            AuthService(db).login(LoginRequest(email="svc2@test.com", password="wrong"))

    def test_unknown_email_raises(self, db: Session):
        with pytest.raises(BadRequestError):
            AuthService(db).login(LoginRequest(email="ghost@test.com", password="x"))


# ─────────────────────────────────────────────────────────────────────────────
# UserService
# ─────────────────────────────────────────────────────────────────────────────

class TestUserService:
    def test_create_user(self, db: Session):
        svc = UserService(db)
        user = svc.create(UserCreate(email="new@svc.com", full_name="New", password="Password1"))
        assert user.id is not None
        assert user.hashed_password != "Password1"

    def test_duplicate_email_raises(self, db: Session):
        svc = UserService(db)
        svc.create(UserCreate(email="dup@svc.com", full_name="A", password="Password1"))
        with pytest.raises(ConflictError):
            svc.create(UserCreate(email="dup@svc.com", full_name="B", password="Password1"))

    def test_get_by_id_not_found(self, db: Session):
        with pytest.raises(NotFoundError):
            UserService(db).get_by_id(999999)

    def test_update_user_name(self, db: Session):
        user = make_user(db, "upd@svc.com", UserRole.client)
        updated = UserService(db).update(user.id, UserUpdate(full_name="Changed"))
        assert updated.full_name == "Changed"

    def test_update_password_hashes_it(self, db: Session):
        user = make_user(db, "pw@svc.com", UserRole.client)
        UserService(db).update(user.id, UserUpdate(password="NewPass456"))
        db.refresh(user)
        assert user.hashed_password != "NewPass456"


# ─────────────────────────────────────────────────────────────────────────────
# TicketService
# ─────────────────────────────────────────────────────────────────────────────

class TestTicketService:
    def test_create_ticket(self, db: Session, client_user):
        svc = TicketService(db)
        ticket = svc.create(
            TicketCreate(title="T", description="D", priority="MEDIUM", ticket_type="standard"),
            creator=client_user,
        )
        assert ticket.id is not None
        assert ticket.status == TicketStatus.NEW
        assert ticket.due_at is not None

    def test_client_cannot_create_internal_ticket(self, db: Session, client_user):
        with pytest.raises(ForbiddenError):
            TicketService(db).create(
                TicketCreate(title="Int", description="D", priority="LOW", ticket_type="internal"),
                creator=client_user,
            )

    def test_get_nonexistent_ticket_raises(self, db: Session, admin_user):
        with pytest.raises(NotFoundError):
            TicketService(db).get_by_id(999999, requesting_user=admin_user)

    def test_client_cannot_view_another_clients_ticket(self, db: Session, client_user, second_client):
        t = make_ticket(db, second_client)
        with pytest.raises(ForbiddenError):
            TicketService(db).get_by_id(t.id, requesting_user=client_user)

    def test_update_status(self, db: Session, client_user, admin_user):
        t = make_ticket(db, client_user)
        updated = TicketService(db).update(t.id, TicketUpdate(status=TicketStatus.IN_PROGRESS), actor=admin_user)
        assert updated.status == TicketStatus.IN_PROGRESS

    def test_resolve_sets_resolved_at(self, db: Session, client_user, admin_user):
        t = make_ticket(db, client_user)
        updated = TicketService(db).update(t.id, TicketUpdate(status=TicketStatus.RESOLVED), actor=admin_user)
        assert updated.resolved_at is not None

    def test_agent_cannot_directly_reassign(self, db: Session, client_user, agent_user, second_agent):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        with pytest.raises(ForbiddenError):
            TicketService(db).update(t.id, TicketUpdate(assigned_to=second_agent.id), actor=agent_user)

    def test_self_assign(self, db: Session, client_user, agent_user):
        t = make_ticket(db, client_user)
        result = TicketService(db).self_assign(t.id, agent=agent_user)
        assert result.assigned_to == agent_user.id
        assert result.status == TicketStatus.ASSIGNED

    def test_self_assign_resolved_raises(self, db: Session, client_user, agent_user):
        t = make_ticket(db, client_user, status=TicketStatus.RESOLVED)
        with pytest.raises(BadRequestError):
            TicketService(db).self_assign(t.id, agent=agent_user)

    def test_escalate_to_agent(self, db: Session, client_user, agent_user, second_agent):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        result = TicketService(db).escalate_to_agent(t.id, second_agent.id, actor=agent_user)
        assert result.status == TicketStatus.ESCALATED
        assert result.assigned_to == second_agent.id

    def test_escalate_to_nonexistent_agent_raises(self, db: Session, client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        with pytest.raises(NotFoundError):
            TicketService(db).escalate_to_agent(t.id, 999999, actor=agent_user)

    def test_cancel_sets_cancelled_at(self, db: Session, client_user):
        t = make_ticket(db, client_user)
        result = TicketService(db).cancel(t.id, requester=client_user)
        assert result.status == TicketStatus.CANCELLED
        assert result.cancelled_at is not None

    def test_agent_cannot_cancel(self, db: Session, client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        with pytest.raises(ForbiddenError):
            TicketService(db).cancel(t.id, requester=agent_user)

    def test_client_cannot_cancel_others_ticket(self, db: Session, client_user, second_client):
        t = make_ticket(db, second_client)
        with pytest.raises(ForbiddenError):
            TicketService(db).cancel(t.id, requester=client_user)

    def test_sla_escalation(self, db: Session, client_user):
        from datetime import datetime, timedelta, timezone
        t = make_ticket(db, client_user, status=TicketStatus.NEW)
        # Backdate due_at to simulate SLA breach
        t.due_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.flush()
        count = TicketService(db).escalate_overdue_tickets()
        assert count >= 1
        db.refresh(t)
        assert t.status == TicketStatus.ESCALATED


# ─────────────────────────────────────────────────────────────────────────────
# CommentService
# ─────────────────────────────────────────────────────────────────────────────

class TestCommentService:
    def test_add_comment(self, db: Session, client_user):
        t = make_ticket(db, client_user)
        comment = CommentService(db).add_comment(
            t.id, CommentCreate(content="Test comment", is_internal=False), author=client_user
        )
        assert comment.id is not None
        assert comment.content == "Test comment"

    def test_client_cannot_add_internal_note(self, db: Session, client_user):
        t = make_ticket(db, client_user)
        with pytest.raises(ForbiddenError):
            CommentService(db).add_comment(
                t.id, CommentCreate(content="secret", is_internal=True), author=client_user
            )

    def test_client_cannot_comment_on_other_ticket(self, db: Session, client_user, second_client):
        t = make_ticket(db, second_client)
        with pytest.raises(ForbiddenError):
            CommentService(db).add_comment(
                t.id, CommentCreate(content="hi", is_internal=False), author=client_user
            )

    def test_internal_notes_hidden_from_clients(self, db: Session, client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        CommentService(db).add_comment(
            t.id, CommentCreate(content="internal", is_internal=True), author=agent_user
        )
        comments = CommentService(db).list_comments(t.id, requesting_user=client_user)
        assert all(not c.is_internal for c in comments)

    def test_agents_see_internal_notes(self, db: Session, client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.ASSIGNED)
        CommentService(db).add_comment(
            t.id, CommentCreate(content="internal", is_internal=True), author=agent_user
        )
        comments = CommentService(db).list_comments(t.id, requesting_user=agent_user)
        assert any(c.is_internal for c in comments)


# ─────────────────────────────────────────────────────────────────────────────
# RatingService
# ─────────────────────────────────────────────────────────────────────────────

class TestRatingService:
    def test_client_can_rate_resolved_ticket(self, db: Session, client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.RESOLVED)
        rating = RatingService(db).rate_ticket(t.id, RatingCreate(score=5, feedback="Great!"), client=client_user)
        assert rating.score == 5
        assert rating.agent_id == agent_user.id

    def test_cannot_rate_unresolved(self, db: Session, client_user):
        t = make_ticket(db, client_user)
        with pytest.raises(BadRequestError):
            RatingService(db).rate_ticket(t.id, RatingCreate(score=4), client=client_user)

    def test_cannot_rate_twice(self, db: Session, client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.RESOLVED)
        RatingService(db).rate_ticket(t.id, RatingCreate(score=5), client=client_user)
        with pytest.raises(BadRequestError):
            RatingService(db).rate_ticket(t.id, RatingCreate(score=3), client=client_user)

    def test_non_owner_cannot_rate(self, db: Session, client_user, second_client, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.RESOLVED)
        with pytest.raises(ForbiddenError):
            RatingService(db).rate_ticket(t.id, RatingCreate(score=1), client=second_client)

    def test_agent_cannot_rate(self, db: Session, client_user, agent_user):
        t = make_ticket(db, client_user, assigned_to=agent_user.id, status=TicketStatus.RESOLVED)
        with pytest.raises(ForbiddenError):
            RatingService(db).rate_ticket(t.id, RatingCreate(score=4), client=agent_user)
