from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.db.session        import get_db
from app.models.user       import User, UserRole
from app.schemas.group     import GroupCreate, GroupRead, GroupUpdate
from app.services.group_service import GroupService

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("/", response_model=GroupRead, status_code=201, summary="Create group (admin)")
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return GroupService(db).create(payload)


@router.get("/", response_model=list[GroupRead], summary="List all active groups")
def list_groups(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return GroupService(db).list_groups()


@router.get("/{group_id}", response_model=GroupRead, summary="Get group by ID")
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return GroupService(db).get_by_id(group_id)


@router.patch("/{group_id}", response_model=GroupRead, summary="Update group (admin)")
def update_group(
    group_id: int,
    payload: GroupUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return GroupService(db).update(group_id, payload)


@router.delete("/{group_id}", status_code=204, summary="Delete group (admin)")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    GroupService(db).delete(group_id)
