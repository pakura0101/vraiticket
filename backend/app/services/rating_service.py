from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.rating import Rating
from app.models.ticket import Ticket, TicketStatus
from app.models.ticket_log import LogAction, TicketLog
from app.models.user import User, UserRole
from app.schemas.ticket_log import RatingCreate


class RatingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def rate_ticket(self, ticket_id: int, payload: RatingCreate, client: User) -> Rating:
        if client.role != UserRole.client:
            raise ForbiddenError("Only clients can rate tickets")

        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise NotFoundError("Ticket")

        if ticket.created_by != client.id:
            raise ForbiddenError("You can only rate your own tickets")

        if ticket.status != TicketStatus.RESOLVED:
            raise BadRequestError("Ticket must be RESOLVED before it can be rated")

        if not ticket.assigned_to:
            raise BadRequestError("Ticket has no assigned agent to rate")

        existing = self.db.query(Rating).filter(Rating.ticket_id == ticket_id).first()
        if existing:
            raise BadRequestError("This ticket has already been rated")

        rating = Rating(
            ticket_id=ticket_id,
            client_id=client.id,
            agent_id=ticket.assigned_to,
            score=payload.score,
            feedback=payload.feedback,
        )
        self.db.add(rating)

        log = TicketLog(
            ticket_id=ticket_id,
            actor_id=client.id,
            action=LogAction.RATED,
            description=f"Rated {payload.score}/5",
            new_value=str(payload.score),
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(rating)
        return rating
