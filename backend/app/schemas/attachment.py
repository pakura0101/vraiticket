from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserSummary


class AttachmentRead(BaseModel):
    id: int
    ticket_id: int
    uploader_id: int
    filename: str
    mime_type: str
    size_bytes: int
    created_at: datetime
    uploader: UserSummary | None = None
    # URL generated at response time
    url: str = ""

    model_config = {"from_attributes": True}
