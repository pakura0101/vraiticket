import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class LogAction(str, enum.Enum):
    CREATED = "CREATED"
    STATUS_CHANGED = "STATUS_CHANGED"
    ASSIGNED = "ASSIGNED"
    PRIORITY_CHANGED = "PRIORITY_CHANGED"
    CATEGORY_CHANGED = "CATEGORY_CHANGED"
    COMMENT_ADDED = "COMMENT_ADDED"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    RATED = "RATED"
    UPDATED = "UPDATED"


class TicketLog(Base):
    __tablename__ = "ticket_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[LogAction] = mapped_column(Enum(LogAction), nullable=False)

    # Human-readable description of the change
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Store old/new values for status/assignment changes
    old_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # ── Relationships ───────────────────────────────────────────
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="logs")  # noqa: F821
    actor: Mapped["User"] = relationship("User", foreign_keys=[actor_id])  # noqa: F821

    def __repr__(self) -> str:
        return f"<TicketLog id={self.id} action={self.action} ticket_id={self.ticket_id}>"
