from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.comment import Comment
from app.models.ticket import Ticket
from app.models.ticket_log import LogAction, TicketLog
from app.models.user import User, UserRole
from app.schemas.comment import CommentCreate
from app.utils.notifications import notify_comment_added


class CommentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add_comment(self, ticket_id: int, payload: CommentCreate, author: User) -> Comment:
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise NotFoundError("Ticket")

        # Clients cannot post internal notes
        if payload.is_internal and author.role == UserRole.client:
            raise ForbiddenError("Clients cannot create internal notes")

        # Clients can only comment on their own tickets
        if author.role == UserRole.client and ticket.created_by != author.id:
            raise ForbiddenError("You do not have access to this ticket")

        comment = Comment(
            ticket_id=ticket_id,
            author_id=author.id,
            content=payload.content,
            is_internal=payload.is_internal,
        )
        self.db.add(comment)

        # Audit log
        log = TicketLog(
            ticket_id=ticket_id,
            actor_id=author.id,
            action=LogAction.COMMENT_ADDED,
            description=f"{'[Internal] ' if payload.is_internal else ''}Comment added by {author.email}",
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(comment)

        # Notify ticket creator (skip if they wrote the comment themselves)
        if ticket.creator and ticket.creator.id != author.id:
            notify_comment_added(ticket_id, ticket.creator.email, author.full_name)

        return comment

    def list_comments(self, ticket_id: int, requesting_user: User) -> list[Comment]:
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise NotFoundError("Ticket")

        if requesting_user.role == UserRole.client and ticket.created_by != requesting_user.id:
            raise ForbiddenError("You do not have access to this ticket")

        q = (
            self.db.query(Comment)
            .options(joinedload(Comment.author))
            .filter(Comment.ticket_id == ticket_id)
        )

        # Clients cannot see internal notes
        if requesting_user.role == UserRole.client:
            q = q.filter(not Comment.is_internal)

        return q.order_by(Comment.created_at.asc()).all()
