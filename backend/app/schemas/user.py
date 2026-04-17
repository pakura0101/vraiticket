from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str | None = None
    role: UserRole = UserRole.client
    company_id: int | None = None
    job_title: str | None = None
    department: str | None = None


class UserCreate(UserBase):
    password: str
    avatar_url: str | None = None     # optional photo at creation (agents/admins)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    full_name:  str | None = None
    phone:      str | None = None
    avatar_url: str | None = None
    is_active:  bool | None = None
    company_id: int | None = None
    job_title:  str | None = None
    department: str | None = None
    role:       UserRole | None = None  # admin only
    password:   str | None = None       # admin only


class UserRead(UserBase):
    id: int
    is_active: bool
    avatar_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserSummary(BaseModel):
    """Lightweight — embedded in Ticket, Comment, etc."""
    id: int
    full_name: str
    email: str
    role: UserRole
    job_title: str | None = None
    avatar_url: str | None = None

    model_config = {"from_attributes": True}
