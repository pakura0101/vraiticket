from datetime import datetime
from pydantic import BaseModel


class CompanyBase(BaseModel):
    name: str
    description: str | None = None
    domain: str | None = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    domain: str | None = None
    is_active: bool | None = None


class CompanyRead(CompanyBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
