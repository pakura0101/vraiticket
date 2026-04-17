from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.stats import SystemStats
from app.services.stats_service import StatsService
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/stats",
    response_model=SystemStats,
    summary="System-wide stats (admin only)",
)
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return StatsService(db).get_system_stats()


@router.post(
    "/sla/check",
    summary="Manually trigger SLA escalation check (admin only)",
)
def trigger_sla_check(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    escalated = TicketService(db).escalate_overdue_tickets()
    return {"escalated_count": escalated, "message": f"{escalated} ticket(s) escalated"}
