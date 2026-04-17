from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def login(self, payload: LoginRequest) -> TokenResponse:
        user = (
            self.db.query(User)
            .filter(User.email == payload.email, User.is_active == True)
            .first()
        )
        if not user or not verify_password(payload.password, user.hashed_password):
            raise BadRequestError("Invalid email or password")

        token = create_access_token(
            subject=user.id,
            extra_claims={"role": user.role.value, "email": user.email},
        )
        return TokenResponse(access_token=token)
