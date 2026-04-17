from datetime import datetime
from pydantic import BaseModel
from app.models.ticket import TicketPriority, TicketStatus, TicketType
from app.schemas.user       import UserSummary
from app.schemas.group      import GroupSummary
from app.schemas.attachment import AttachmentRead
from app.schemas.ticket_log import RatingRead


class TicketCreate(BaseModel):
    title: str
    description: str
    priority:    TicketPriority = TicketPriority.MEDIUM
    ticket_type: TicketType     = TicketType.standard
    company_id:  int | None     = None
    group_id:    int | None     = None


class TicketUpdate(BaseModel):
    title:       str | None            = None
    description: str | None            = None
    status:      TicketStatus | None   = None
    priority:    TicketPriority | None = None
    group_id:    int | None            = None
    assigned_to: int | None            = None
    due_at:      datetime | None       = None


class TicketRead(BaseModel):
    id: int
    title: str
    description: str
    status:      TicketStatus
    priority:    TicketPriority
    ticket_type: TicketType
    company_id:  int | None   = None
    group_id:    int | None   = None
    created_by:  int
    assigned_to: int | None   = None
    due_at:            datetime | None = None
    first_response_at: datetime | None = None
    resolved_at:       datetime | None = None
    cancelled_at:      datetime | None = None
    created_at: datetime
    updated_at: datetime
    creator:     UserSummary | None      = None
    assignee:    UserSummary | None      = None
    group:       GroupSummary | None     = None
    attachments: list[AttachmentRead]    = []
    rating:      RatingRead | None       = None

    model_config = {"from_attributes": True}


class TicketListItem(BaseModel):
    id: int
    title: str
    status:      TicketStatus
    priority:    TicketPriority
    ticket_type: TicketType
    created_by:  int
    assigned_to: int | None  = None
    group_id:    int | None  = None
    due_at:      datetime | None = None
    created_at:  datetime
    updated_at:  datetime
    creator:  UserSummary | None  = None
    assignee: UserSummary | None  = None
    group:    GroupSummary | None = None

    model_config = {"from_attributes": True}
