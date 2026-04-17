import uuid as _uuid
from pathlib import Path as _Path

from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.core.exceptions   import BadRequestError, ForbiddenError, NotFoundError
from app.db.session        import get_db
from app.models.user       import User, UserRole
from app.schemas.common    import PaginatedResponse
from app.schemas.user      import UserCreate, UserRead, UserUpdate
from app.services.user_service import UserService
from app.utils.pagination  import paginate

router = APIRouter(prefix="/users", tags=["Users"])

# ── Storage paths — absolute, anchored to this file so they never depend on cwd ──
# app/api/v1/endpoints/users.py  →  ../../../../uploads/avatars
_BASE_DIR    = _Path(__file__).resolve().parent.parent.parent.parent.parent
_AVATAR_DIR  = _BASE_DIR / "uploads" / "avatars"
_AVATAR_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp"}
_AVATAR_MAX  = 2 * 1024 * 1024  # 2 MB
_EXT_TO_MIME = {
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".gif":  "image/gif",
    ".webp": "image/webp",
}


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("/", response_model=UserRead, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return UserService(db).create(payload)


@router.get("/", response_model=PaginatedResponse[UserRead])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: str | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    users, total = UserService(db).list_users(page=page, page_size=page_size, role=role)
    return paginate(users, total, page, page_size)


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.admin and current_user.id != user_id:
        raise ForbiddenError()
    return UserService(db).get_by_id(user_id)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.admin:
        if current_user.id != user_id:
            raise ForbiddenError()
        payload.role = None
    return UserService(db).update(user_id, payload)


# ── Avatar upload ─────────────────────────────────────────────────────────────

@router.post("/{user_id}/avatar", response_model=UserRead,
             summary="Upload or replace a user's avatar photo")
async def upload_avatar(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.admin and current_user.id != user_id:
        raise ForbiddenError("You can only upload your own avatar")

    if file.content_type not in _AVATAR_MIME:
        raise BadRequestError("Only JPEG, PNG, GIF or WEBP images are allowed")

    content = await file.read()
    if len(content) > _AVATAR_MAX:
        raise BadRequestError("Avatar must be under 2 MB")

    # Ensure directory exists (uses absolute path — safe regardless of cwd)
    _AVATAR_DIR.mkdir(parents=True, exist_ok=True)

    # Delete any previous avatar files for this user before writing the new one
    if _AVATAR_DIR.exists():
        for old_file in _AVATAR_DIR.glob(f"user_{user_id}_*"):
            try:
                old_file.unlink()
            except OSError:
                pass

    ext      = _Path(file.filename or "avatar").suffix.lower() or ".jpg"
    filename = f"user_{user_id}_{_uuid.uuid4().hex[:8]}{ext}"
    dest     = _AVATAR_DIR / filename
    dest.write_bytes(content)

    return UserService(db).update(user_id, UserUpdate(
        avatar_url=f"/api/v1/users/{user_id}/avatar"
    ))


# ── Avatar serve ──────────────────────────────────────────────────────────────

@router.get("/{user_id}/avatar", summary="Serve avatar image (authenticated)")
def serve_avatar(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return the stored avatar for a user. 404 if none uploaded."""
    # Confirm user exists
    UserService(db).get_by_id(user_id)

    if not _AVATAR_DIR.exists():
        raise NotFoundError("Avatar")

    # Find the file for this user (there should be exactly one after cleanup)
    matches = sorted(
        _AVATAR_DIR.glob(f"user_{user_id}_*"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not matches:
        raise NotFoundError("Avatar")

    file_path = matches[0]
    data = file_path.read_bytes()
    mime = _EXT_TO_MIME.get(file_path.suffix.lower(), "image/jpeg")

    return Response(
        content=data,
        media_type=mime,
        headers={
            "Content-Disposition": f'inline; filename="{file_path.name}"',
            "Cache-Control": "private, max-age=3600",
        },
    )
