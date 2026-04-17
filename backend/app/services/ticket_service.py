import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session, joinedload

from app.core.config     import settings
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.attachment import Attachment
from app.models.ticket   import Ticket, TicketStatus, TicketType
from app.models.ticket_log import LogAction, TicketLog
from app.models.user     import User, UserRole
from app.schemas.ticket  import TicketCreate, TicketUpdate
from app.utils.notifications import (
    notify_ticket_assigned, notify_ticket_created,
    notify_ticket_resolved, notify_status_changed,
)

# Use an absolute path anchored to this file so uploads work regardless of cwd.
# services/ticket_service.py → ../../.. → project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = _PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_MIME = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB


class TicketService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Create ──────────────────────────────────────────────────────────────────

    def create(self, payload: TicketCreate, creator: User) -> Ticket:
        due_at = datetime.now(timezone.utc) + timedelta(hours=settings.DEFAULT_SLA_HOURS)

        if payload.ticket_type == TicketType.internal and creator.role == UserRole.client:
            raise ForbiddenError("Clients cannot create internal tickets")

        ticket = Ticket(
            title=payload.title,
            description=payload.description,
            priority=payload.priority,
            ticket_type=payload.ticket_type,
            company_id=payload.company_id or creator.company_id,
            group_id=payload.group_id,
            created_by=creator.id,
            due_at=due_at,
        )

        self.db.add(ticket)
        self.db.flush()
        self._log(ticket.id, creator.id, LogAction.CREATED, f"Ticket created by {creator.email}")

        self.db.commit()
        self.db.refresh(ticket)
        notify_ticket_created(ticket.id, creator.email, ticket.title)
        return ticket

    # ── Read ────────────────────────────────────────────────────────────────────

    def get_by_id(self, ticket_id: int, requesting_user: User) -> Ticket:
        ticket = (
            self.db.query(Ticket)
            .options(
                joinedload(Ticket.creator),
                joinedload(Ticket.assignee),
                joinedload(Ticket.group),
                joinedload(Ticket.attachments).joinedload(Attachment.uploader),
                joinedload(Ticket.rating),
            )
            .filter(Ticket.id == ticket_id)
            .first()
        )
        if not ticket:
            raise NotFoundError("Ticket")
        self._assert_can_view(ticket, requesting_user)
        return ticket

    def list_tickets(
        self,
        requesting_user: User,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
        priority: str | None = None,
        group_id: int | None = None,
        assigned_to: int | None = None,
        ticket_type: str | None = None,
    ) -> tuple[list[Ticket], int]:
        q = (
            self.db.query(Ticket)
            .options(joinedload(Ticket.creator), joinedload(Ticket.assignee), joinedload(Ticket.group))
        )

        if requesting_user.role == UserRole.client:
            q = q.filter(Ticket.created_by == requesting_user.id)
        elif requesting_user.role == UserRole.agent:
            from sqlalchemy import or_
            agent_group_ids = [g.id for g in requesting_user.groups]
            q = q.filter(
                or_(
                    Ticket.assigned_to == requesting_user.id,
                    Ticket.group_id.in_(agent_group_ids) if agent_group_ids else False,
                )
            )

        if status:      q = q.filter(Ticket.status == status)
        if priority:    q = q.filter(Ticket.priority == priority)
        if group_id:    q = q.filter(Ticket.group_id == group_id)
        if ticket_type: q = q.filter(Ticket.ticket_type == ticket_type)
        if assigned_to is not None and requesting_user.role == UserRole.admin:
            q = q.filter(Ticket.assigned_to == assigned_to)

        q = q.order_by(Ticket.created_at.desc())
        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    # ── Update ──────────────────────────────────────────────────────────────────

    def update(self, ticket_id: int, payload: TicketUpdate, actor: User) -> Ticket:
        ticket = self._get_ticket_or_404(ticket_id)
        self._assert_can_modify(ticket, actor)
        changes = payload.model_dump(exclude_unset=True)

        # Block agents from changing assignment directly (must use escalate)
        if "assigned_to" in changes and actor.role == UserRole.agent:
            raise ForbiddenError("Agents must use the escalate endpoint to transfer tickets")

        if "status" in changes:
            old = ticket.status.value
            new = changes["status"].value if hasattr(changes["status"], "value") else changes["status"]
            self._log(ticket.id, actor.id, LogAction.STATUS_CHANGED,
                      f"Status changed {old} → {new}", old_value=old, new_value=new)
            if changes["status"] == TicketStatus.RESOLVED and not ticket.resolved_at:
                ticket.resolved_at = datetime.now(timezone.utc)
                notify_ticket_resolved(ticket.id, ticket.creator.email, ticket.title)
            notify_status_changed(ticket.id, ticket.creator.email, old, new)

        if "priority" in changes:
            self._log(ticket.id, actor.id, LogAction.PRIORITY_CHANGED,
                      f"Priority changed {ticket.priority} → {changes['priority']}",
                      old_value=ticket.priority.value, new_value=str(changes["priority"]))

        # Admin assignment change
        if "assigned_to" in changes and actor.role == UserRole.admin:
            old_val = str(ticket.assigned_to) if ticket.assigned_to else None
            new_val = str(changes["assigned_to"]) if changes["assigned_to"] else None
            self._log(ticket.id, actor.id, LogAction.ASSIGNED,
                      "Assignment changed by admin", old_value=old_val, new_value=new_val)

        for field, value in changes.items():
            setattr(ticket, field, value)

        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    # ── Self-assign ─────────────────────────────────────────────────────────────

    def self_assign(self, ticket_id: int, agent: User) -> Ticket:
        if agent.role not in (UserRole.agent, UserRole.admin):
            raise ForbiddenError("Only agents can self-assign tickets")

        ticket = self._get_ticket_or_404(ticket_id)

        if ticket.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED):
            raise BadRequestError("Cannot assign a resolved/closed/cancelled ticket")

        if agent.role == UserRole.agent and ticket.group_id:
            agent_group_ids = [g.id for g in agent.groups]
            if ticket.group_id not in agent_group_ids:
                raise ForbiddenError("You are not a member of this ticket's group")

        old_assignee = str(ticket.assigned_to) if ticket.assigned_to else None
        ticket.assigned_to = agent.id
        ticket.status      = TicketStatus.ASSIGNED

        self._log(ticket.id, agent.id, LogAction.ASSIGNED,
                  f"Self-assigned by {agent.email}",
                  old_value=old_assignee, new_value=str(agent.id))

        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    # ── Escalate to another agent ───────────────────────────────────────────────

    def escalate_to_agent(self, ticket_id: int, target_agent_id: int, actor: User) -> Ticket:
        """
        An agent escalates a ticket they own to another agent.
        Admin can escalate to any agent.
        """
        ticket = self._get_ticket_or_404(ticket_id)

        if actor.role == UserRole.client:
            raise ForbiddenError("Clients cannot escalate tickets")

        if actor.role == UserRole.agent and ticket.assigned_to != actor.id:
            raise ForbiddenError("You can only escalate tickets assigned to you")

        if ticket.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED):
            raise BadRequestError("Cannot escalate a resolved/closed/cancelled ticket")

        target = self.db.query(User).filter(
            User.id == target_agent_id,
            User.role == UserRole.agent,
            User.is_active == True,
        ).first()
        if not target:
            raise NotFoundError("Target agent")

        old_assignee = str(ticket.assigned_to) if ticket.assigned_to else None
        ticket.assigned_to = target_agent_id
        ticket.status      = TicketStatus.ESCALATED

        self._log(ticket.id, actor.id, LogAction.ESCALATED,
                  f"Escalated to {target.full_name} by {actor.email}",
                  old_value=old_assignee, new_value=str(target_agent_id))

        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    # ── Cancel — only clients (own tickets) and admins ──────────────────────────

    def cancel(self, ticket_id: int, requester: User) -> Ticket:
        ticket = self._get_ticket_or_404(ticket_id)

        # Agents cannot cancel tickets
        if requester.role == UserRole.agent:
            raise ForbiddenError("Agents cannot cancel tickets. Use escalate or update status instead.")

        if requester.role == UserRole.client and ticket.created_by != requester.id:
            raise ForbiddenError("You can only cancel your own tickets")

        if ticket.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED):
            raise BadRequestError(f"Cannot cancel a ticket with status {ticket.status.value}")

        old_status = ticket.status.value
        ticket.status       = TicketStatus.CANCELLED
        ticket.cancelled_at = datetime.now(timezone.utc)

        self._log(ticket.id, requester.id, LogAction.STATUS_CHANGED,
                  f"Ticket cancelled by {requester.email}",
                  old_value=old_status, new_value="CANCELLED")

        self.db.commit()
        self.db.refresh(ticket)
        return ticket

    # ── Attachments ─────────────────────────────────────────────────────────────

    async def upload_attachment(self, ticket_id: int, file: UploadFile, uploader: User) -> Attachment:
        ticket = self._get_ticket_or_404(ticket_id)
        self._assert_can_view(ticket, uploader)

        if file.content_type not in ALLOWED_MIME:
            raise BadRequestError(f"File type '{file.content_type}' is not allowed")

        content = await file.read()
        if len(content) > MAX_FILE_BYTES:
            raise BadRequestError("File exceeds 5 MB limit")

        ext = Path(file.filename or "file").suffix
        stored_name = f"{uuid.uuid4().hex}{ext}"
        stored_path = UPLOAD_DIR / str(ticket_id) / stored_name
        stored_path.parent.mkdir(parents=True, exist_ok=True)
        stored_path.write_bytes(content)

        attachment = Attachment(
            ticket_id=ticket_id,
            uploader_id=uploader.id,
            filename=file.filename or stored_name,
            stored_path=str(stored_path),
            mime_type=file.content_type,
            size_bytes=len(content),
        )
        self.db.add(attachment)
        self.db.commit()
        self.db.refresh(attachment)
        return attachment

    def get_attachment(self, attachment_id: int, requester: User) -> tuple[Attachment, bytes]:
        att = self.db.query(Attachment).filter(Attachment.id == attachment_id).first()
        if not att:
            raise NotFoundError("Attachment")
        ticket = self._get_ticket_or_404(att.ticket_id)
        self._assert_can_view(ticket, requester)
        data = Path(att.stored_path).read_bytes()
        return att, data

    # ── Logs ────────────────────────────────────────────────────────────────────

    def get_logs(self, ticket_id: int, requesting_user: User) -> list[TicketLog]:
        ticket = self._get_ticket_or_404(ticket_id)
        self._assert_can_view(ticket, requesting_user)
        return (
            self.db.query(TicketLog)
            .options(joinedload(TicketLog.actor))
            .filter(TicketLog.ticket_id == ticket_id)
            .order_by(TicketLog.created_at.asc())
            .all()
        )

    # ── SLA escalation ──────────────────────────────────────────────────────────

    def escalate_overdue_tickets(self) -> int:
        now = datetime.now(timezone.utc)
        overdue = (
            self.db.query(Ticket)
            .filter(
                Ticket.due_at < now,
                Ticket.status.notin_([
                    TicketStatus.RESOLVED, TicketStatus.CLOSED,
                    TicketStatus.ESCALATED, TicketStatus.CANCELLED,
                ]),
            )
            .all()
        )
        count = 0
        for ticket in overdue:
            ticket.status = TicketStatus.ESCALATED
            self._log(ticket.id, None, LogAction.ESCALATED,
                      f"Auto-escalated: SLA breached (due_at={ticket.due_at})",
                      old_value="OPEN", new_value="ESCALATED")
            count += 1
        if count:
            self.db.commit()
        return count

    # ── Helpers ─────────────────────────────────────────────────────────────────

    def _get_ticket_or_404(self, ticket_id: int) -> Ticket:
        ticket = (
            self.db.query(Ticket)
            .options(joinedload(Ticket.creator))
            .filter(Ticket.id == ticket_id)
            .first()
        )
        if not ticket:
            raise NotFoundError("Ticket")
        return ticket

    def _log(self, ticket_id, actor_id, action, description=None, old_value=None, new_value=None):
        log = TicketLog(ticket_id=ticket_id, actor_id=actor_id, action=action,
                        description=description, old_value=old_value, new_value=new_value)
        self.db.add(log)
        return log

    def _assert_can_view(self, ticket: Ticket, user: User) -> None:
        if user.role == UserRole.admin:
            return
        if user.role == UserRole.agent:
            agent_group_ids = [g.id for g in user.groups]
            if ticket.assigned_to == user.id or (ticket.group_id and ticket.group_id in agent_group_ids):
                return
        if user.role == UserRole.client and ticket.created_by == user.id:
            return
        raise ForbiddenError("You do not have access to this ticket")

    def _assert_can_modify(self, ticket: Ticket, user: User) -> None:
        if user.role == UserRole.admin:
            return
        if user.role == UserRole.agent and ticket.assigned_to == user.id:
            return
        raise ForbiddenError("You cannot modify this ticket")
