from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int]          = mapped_column(Integer, primary_key=True, index=True)
    ticket_id: Mapped[int]   = mapped_column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    uploader_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id",   ondelete="RESTRICT"), nullable=False)
    filename: Mapped[str]    = mapped_column(String(500), nullable=False)   # original name
    stored_path: Mapped[str] = mapped_column(String(1000), nullable=False)  # path on disk / key in S3
    mime_type: Mapped[str]   = mapped_column(String(127), nullable=False)
    size_bytes: Mapped[int]  = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    ticket:   Mapped["Ticket"] = relationship("Ticket", back_populates="attachments")  # noqa: F821
    uploader: Mapped["User"]   = relationship("User",   foreign_keys=[uploader_id])    # noqa: F821

    def __repr__(self) -> str:
        return f"<Attachment id={self.id} ticket={self.ticket_id} file={self.filename}>"
