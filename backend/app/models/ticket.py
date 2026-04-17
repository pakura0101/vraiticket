import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TicketStatus(str, enum.Enum):
    NEW         = "NEW"
    ASSIGNED    = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    ON_HOLD     = "ON_HOLD"
    RESOLVED    = "RESOLVED"
    CLOSED      = "CLOSED"
    ESCALATED   = "ESCALATED"
    CANCELLED   = "CANCELLED"


class TicketPriority(str, enum.Enum):
    LOW    = "LOW"
    MEDIUM = "MEDIUM"
    HIGH   = "HIGH"


class TicketType(str, enum.Enum):
    standard = "standard"   # client-submitted
    internal = "internal"   # agent/admin internal ticket


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int]              = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str]           = mapped_column(String(500), nullable=False)
    description: Mapped[str]     = mapped_column(Text, nullable=False)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), nullable=False, default=TicketStatus.NEW, index=True)
    priority: Mapped[TicketPriority] = mapped_column(Enum(TicketPriority), nullable=False, default=TicketPriority.MEDIUM)
    ticket_type: Mapped[TicketType]  = mapped_column(Enum(TicketType), nullable=False, default=TicketType.standard)

    # Foreign keys
    company_id:  Mapped[int | None] = mapped_column(Integer, ForeignKey("companies.id",  ondelete="SET NULL"), nullable=True, index=True)
    group_id:    Mapped[int | None] = mapped_column(Integer, ForeignKey("groups.id",     ondelete="SET NULL"), nullable=True, index=True)
    created_by:  Mapped[int]        = mapped_column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    assigned_to: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Timestamps
    created_at:        Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at:        Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    due_at:            Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at:       Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at:      Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    company:     Mapped["Company"]          = relationship("Company",    back_populates="tickets")   # noqa: F821
    group:       Mapped["Group"]            = relationship("Group",      back_populates="tickets")   # noqa: F821
    creator:     Mapped["User"]             = relationship("User", back_populates="created_tickets",  foreign_keys=[created_by])   # noqa: F821
    assignee:    Mapped["User"]             = relationship("User", back_populates="assigned_tickets", foreign_keys=[assigned_to])  # noqa: F821
    comments:    Mapped[list["Comment"]]    = relationship("Comment",    back_populates="ticket", cascade="all, delete-orphan")  # noqa: F821
    logs:        Mapped[list["TicketLog"]]  = relationship("TicketLog",  back_populates="ticket", cascade="all, delete-orphan")  # noqa: F821
    rating:      Mapped["Rating"]           = relationship("Rating",     back_populates="ticket", uselist=False)  # noqa: F821
    attachments: Mapped[list["Attachment"]] = relationship("Attachment", back_populates="ticket", cascade="all, delete-orphan")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Ticket id={self.id} status={self.status} type={self.ticket_type}>"
