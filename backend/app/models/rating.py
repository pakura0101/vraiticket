from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Rating(Base):
    __tablename__ = "ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    client_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    agent_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        CheckConstraint("score >= 1 AND score <= 5", name="ck_rating_score_range"),
    )

    # ── Relationships ───────────────────────────────────────────
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="rating")  # noqa: F821
    client: Mapped["User"] = relationship("User", back_populates="ratings_given", foreign_keys=[client_id])  # noqa: F821
    agent: Mapped["User"] = relationship("User", back_populates="ratings_received", foreign_keys=[agent_id])  # noqa: F821

    def __repr__(self) -> str:
        return f"<Rating id={self.id} ticket_id={self.ticket_id} score={self.score}>"
