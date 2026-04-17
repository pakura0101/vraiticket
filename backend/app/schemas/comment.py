from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserSummary


class CommentCreate(BaseModel):
    content: str
    is_internal: bool = False


class CommentUpdate(BaseModel):
    content: str


class CommentRead(BaseModel):
    id: int
    ticket_id: int
    author_id: int
    content: str
    is_internal: bool
    created_at: datetime
    updated_at: datetime
    author: UserSummary | None = None

    model_config = {"from_attributes": True}
