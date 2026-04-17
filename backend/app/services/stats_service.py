from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.rating import Rating
from app.models.ticket import Ticket, TicketStatus
from app.models.user   import User, UserRole
from app.schemas.stats import AgentStats, SystemStats, TicketStatusCount

# Statuses that are considered "closed" / no longer active
_INACTIVE = [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED]


class StatsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_system_stats(self) -> SystemStats:
        total = self.db.query(func.count(Ticket.id)).scalar() or 0

        # Open = anything not resolved, closed, or cancelled
        open_count = (
            self.db.query(func.count(Ticket.id))
            .filter(Ticket.status.notin_(_INACTIVE))
            .scalar()
        ) or 0

        resolved_count = (
            self.db.query(func.count(Ticket.id))
            .filter(Ticket.status == TicketStatus.RESOLVED)
            .scalar()
        ) or 0

        escalated_count = (
            self.db.query(func.count(Ticket.id))
            .filter(Ticket.status == TicketStatus.ESCALATED)
            .scalar()
        ) or 0

        cancelled_count = (
            self.db.query(func.count(Ticket.id))
            .filter(Ticket.status == TicketStatus.CANCELLED)
            .scalar()
        ) or 0

        # Average resolution time in hours (only resolved tickets)
        avg_resolution = (
            self.db.query(
                func.avg(
                    func.extract("epoch", Ticket.resolved_at - Ticket.created_at) / 3600.0
                )
            )
            .filter(Ticket.resolved_at.isnot(None))
            .scalar()
        )

        # Per-status breakdown (real counts, sorted for display)
        status_rows = (
            self.db.query(Ticket.status, func.count(Ticket.id))
            .group_by(Ticket.status)
            .all()
        )
        by_status = [TicketStatusCount(status=s.value, count=c) for s, c in status_rows]

        # Per-agent stats
        agents = (
            self.db.query(User)
            .filter(User.role == UserRole.agent, User.is_active == True)
            .all()
        )

        agent_stats = []
        for agent in agents:
            assigned = (
                self.db.query(func.count(Ticket.id))
                .filter(Ticket.assigned_to == agent.id)
                .scalar()
            ) or 0

            resolved = (
                self.db.query(func.count(Ticket.id))
                .filter(
                    Ticket.assigned_to == agent.id,
                    Ticket.status == TicketStatus.RESOLVED,
                )
                .scalar()
            ) or 0

            # Count of ratings received
            rating_count = (
                self.db.query(func.count(Rating.id))
                .filter(Rating.agent_id == agent.id)
                .scalar()
            ) or 0

            avg_rating_val = (
                self.db.query(func.avg(Rating.score))
                .filter(Rating.agent_id == agent.id)
                .scalar()
            )

            # Per-star breakdown (1–5)
            star_counts: dict[int, int] = {}
            for star in range(1, 6):
                count = (
                    self.db.query(func.count(Rating.id))
                    .filter(Rating.agent_id == agent.id, Rating.score == star)
                    .scalar()
                ) or 0
                star_counts[star] = count

            agent_stats.append(
                AgentStats(
                    agent_id=agent.id,
                    agent_name=agent.full_name,
                    assigned=assigned,
                    resolved=resolved,
                    avg_rating=round(float(avg_rating_val), 2) if avg_rating_val else None,
                    rating_count=rating_count,
                    star_counts=star_counts,
                )
            )

        return SystemStats(
            total_tickets=total,
            open_tickets=open_count,
            resolved_tickets=resolved_count,
            escalated_tickets=escalated_count,
            cancelled_tickets=cancelled_count,
            avg_resolution_hours=round(float(avg_resolution), 2) if avg_resolution else None,
            by_status=by_status,
            agent_stats=agent_stats,
        )
