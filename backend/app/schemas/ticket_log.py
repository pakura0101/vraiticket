from datetime import datetime
from pydantic import BaseModel, field_validator
from app.models.ticket_log import LogAction
from app.schemas.user import UserSummary


class TicketLogRead(BaseModel):
    id: int
    ticket_id: int
    actor_id: int | None = None
    action: LogAction
    description: str | None = None
    old_value: str | None = None
    new_value: str | None = None
    created_at: datetime
    actor: UserSummary | None = None

    model_config = {"from_attributes": True}


# ── Rating ─────────────────────────────────────────────────────────────────────

class RatingCreate(BaseModel):
    score: int
    feedback: str | None = None

    @field_validator("score")
    @classmethod
    def validate_score(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Score must be between 1 and 5")
        return v


class RatingRead(BaseModel):
    id: int
    ticket_id: int
    client_id: int
    agent_id: int
    score: int
    feedback: str | None = None
    created_at: datetime
    client: UserSummary | None = None
    agent: UserSummary | None = None

    model_config = {"from_attributes": True}
