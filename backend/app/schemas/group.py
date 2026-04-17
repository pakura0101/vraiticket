from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserSummary


class GroupBase(BaseModel):
    name: str
    description: str | None = None
    color: str | None = None


class GroupCreate(GroupBase):
    member_ids: list[int] = []


class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    is_active: bool | None = None
    member_ids: list[int] | None = None


class GroupRead(GroupBase):
    id: int
    is_active: bool
    members: list[UserSummary] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GroupSummary(BaseModel):
    id: int
    name: str
    color: str | None = None

    model_config = {"from_attributes": True}
