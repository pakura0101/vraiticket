import logging
import os

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def seed_admin(db: Session) -> None:
    """Create the first admin account if it does not exist."""
    email = os.environ.get("FIRST_ADMIN_EMAIL")
    password = os.environ.get("FIRST_ADMIN_PASSWORD")

    if not email or not password:
        logger.info("FIRST_ADMIN_EMAIL/PASSWORD not set — skipping admin seed.")
        return

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return

    admin = User(
        email=email,
        full_name="System Administrator",
        hashed_password=hash_password(password),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    logger.info("First admin account created: %s", email)
