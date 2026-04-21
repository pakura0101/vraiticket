from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.db.session        import get_db
from app.models.user       import User, UserRole
from app.schemas.attachment import AttachmentRead
from app.schemas.comment    import CommentCreate, CommentRead
from app.schemas.common     import PaginatedResponse
from app.schemas.ticket     import TicketCreate, TicketListItem, TicketRead, TicketUpdate
from app.schemas.ticket_log import RatingCreate, RatingRead, TicketLogRead
from app.services.comment_service import CommentService
from app.services.rating_service  import RatingService
from app.services.ticket_service  import TicketService
from app.utils.pagination  import paginate

router = APIRouter(prefix="/tickets", tags=["Tickets"])


class EscalateRequest(BaseModel):
    target_agent_id: int


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("/", response_model=TicketRead, status_code=201)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    return TicketService(db).create(payload, creator=current_user)


@router.get("/", response_model=PaginatedResponse[TicketListItem])
def list_tickets(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None), priority: str | None = Query(None),
    group_id: int | None = Query(None),
    assigned_to: int | None = Query(None), ticket_type: str | None = Query(None),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    tickets, total = TicketService(db).list_tickets(
        requesting_user=current_user, page=page, page_size=page_size,
        status=status, priority=priority,
        group_id=group_id, assigned_to=assigned_to, ticket_type=ticket_type,
    )
    return paginate(tickets, total, page, page_size)


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(ticket_id: int, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    return TicketService(db).get_by_id(ticket_id, requesting_user=current_user)


@router.patch("/{ticket_id}", response_model=TicketRead)
def update_ticket(ticket_id: int, payload: TicketUpdate,
                  db: Session = Depends(get_db),
                  current_user: User = Depends(require_role(UserRole.agent, UserRole.admin))):
    return TicketService(db).update(ticket_id, payload, actor=current_user)


# ── Self-assign ───────────────────────────────────────────────────────────────

@router.post("/{ticket_id}/assign", response_model=TicketRead,
             summary="Agent takes an unassigned ticket from their group")
def self_assign(ticket_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(require_role(UserRole.agent, UserRole.admin))):
    return TicketService(db).self_assign(ticket_id, agent=current_user)


# ── Escalate to another agent ─────────────────────────────────────────────────

@router.post("/{ticket_id}/escalate", response_model=TicketRead,
             summary="Escalate ticket to a different agent")
def escalate_ticket(ticket_id: int, body: EscalateRequest,
                    db: Session = Depends(get_db),
                    current_user: User = Depends(require_role(UserRole.agent, UserRole.admin))):
    return TicketService(db).escalate_to_agent(ticket_id, body.target_agent_id, actor=current_user)


# ── Cancel ────────────────────────────────────────────────────────────────────

@router.post("/{ticket_id}/cancel", response_model=TicketRead,
             summary="Client cancels their own ticket (not agents)")
def cancel_ticket(ticket_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    return TicketService(db).cancel(ticket_id, requester=current_user)


# ── Attachments ───────────────────────────────────────────────────────────────

@router.post("/{ticket_id}/attachments", response_model=AttachmentRead, status_code=201)
async def upload_attachment(ticket_id: int, file: UploadFile = File(...),
                             db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    svc = TicketService(db)
    att = await svc.upload_attachment(ticket_id, file, uploader=current_user)
    att.url = f"/api/v1/tickets/{ticket_id}/attachments/{att.id}/download"
    return att


@router.get("/{ticket_id}/attachments/{attachment_id}/download")
def download_attachment(ticket_id: int, attachment_id: int,
                         db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    att, data = TicketService(db).get_attachment(attachment_id, requester=current_user)
    # Use inline disposition so images render in browser / axios blob fetch
    # Use attachment only for non-image/non-pdf types
    inline_types = ("image/", "application/pdf", "text/")
    disposition = "inline" if any(att.mime_type.startswith(t) for t in inline_types) else "attachment"
    return Response(
        content=data,
        media_type=att.mime_type,
        headers={
            "Content-Disposition": f'{disposition}; filename="{att.filename}"',
            "Cache-Control": "private, max-age=300",
        }
    )


# ── Logs ──────────────────────────────────────────────────────────────────────

@router.get("/{ticket_id}/logs", response_model=list[TicketLogRead])
def get_ticket_logs(ticket_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    return TicketService(db).get_logs(ticket_id, requesting_user=current_user)


# ── Comments ──────────────────────────────────────────────────────────────────

@router.post("/{ticket_id}/comments", response_model=CommentRead, status_code=201)
def add_comment(ticket_id: int, payload: CommentCreate,
                db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return CommentService(db).add_comment(ticket_id, payload, author=current_user)


@router.get("/{ticket_id}/comments", response_model=list[CommentRead])
def list_comments(ticket_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    return CommentService(db).list_comments(ticket_id, requesting_user=current_user)


# ── Rating ────────────────────────────────────────────────────────────────────

@router.post("/{ticket_id}/rate", response_model=RatingRead, status_code=201)
def rate_ticket(ticket_id: int, payload: RatingCreate,
                db: Session = Depends(get_db),
                current_user: User = Depends(require_role(UserRole.client))):
    return RatingService(db).rate_ticket(ticket_id, payload, client=current_user)
