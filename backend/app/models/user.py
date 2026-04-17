import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    client = "client"
    agent  = "agent"
    admin  = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int]              = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str]           = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str]       = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole]       = mapped_column(Enum(UserRole), nullable=False, default=UserRole.client)
    is_active: Mapped[bool]      = mapped_column(Boolean, default=True, nullable=False)
    phone: Mapped[str | None]    = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None]   = mapped_column(String(500), nullable=True)
    job_title: Mapped[str | None]    = mapped_column(String(255), nullable=True)
    department: Mapped[str | None]   = mapped_column(String(255), nullable=True)
    company_id: Mapped[int | None]   = mapped_column(
        Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    company:          Mapped["Company"]       = relationship("Company", back_populates="members", foreign_keys=[company_id])  # noqa: F821
    created_tickets:  Mapped[list["Ticket"]]  = relationship("Ticket", back_populates="creator",  foreign_keys="Ticket.created_by")  # noqa: F821
    assigned_tickets: Mapped[list["Ticket"]]  = relationship("Ticket", back_populates="assignee", foreign_keys="Ticket.assigned_to")  # noqa: F821
    comments:         Mapped[list["Comment"]] = relationship("Comment", back_populates="author")  # noqa: F821
    ratings_given:    Mapped[list["Rating"]]  = relationship("Rating", back_populates="client", foreign_keys="Rating.client_id")  # noqa: F821
    ratings_received: Mapped[list["Rating"]]  = relationship("Rating", back_populates="agent",  foreign_keys="Rating.agent_id")  # noqa: F821
    groups: Mapped[list["Group"]] = relationship(  # noqa: F821
        "Group", secondary="group_members", back_populates="members"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
