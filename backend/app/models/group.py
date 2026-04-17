from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# ── Many-to-many: users (agents) ↔ groups ─────────────────────────────────────
group_members = Table(
    "group_members",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id",  Integer, ForeignKey("users.id",  ondelete="CASCADE"), primary_key=True),
)


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str]    = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None]       = mapped_column(String(7), nullable=True)   # hex e.g. #14B8A6
    is_active: Mapped[bool]         = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime]    = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime]    = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Agents who are members of this group
    members: Mapped[list["User"]] = relationship(  # noqa: F821
        "User", secondary=group_members, back_populates="groups"
    )
    # Tickets routed to this group
    tickets: Mapped[list["Ticket"]] = relationship("Ticket", back_populates="group")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Group id={self.id} name={self.name}>"
