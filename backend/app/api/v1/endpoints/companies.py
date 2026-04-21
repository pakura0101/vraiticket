from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import NotFoundError, ConflictError
from app.db.session import get_db
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.company import CompanyCreate, CompanyRead, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.post("/", response_model=CompanyRead, status_code=201, summary="Create a company (admin)")
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    existing = db.query(Company).filter(Company.name == payload.name).first()
    if existing:
        raise ConflictError(f"Company '{payload.name}' already exists")
    company = Company(**payload.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/", response_model=list[CompanyRead], summary="List companies")
def list_companies(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),   # all authenticated users
):
    return db.query(Company).filter(Company.is_active).all()


@router.get("/{company_id}", response_model=CompanyRead, summary="Get company by ID")
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise NotFoundError("Company")
    return company


@router.patch("/{company_id}", response_model=CompanyRead, summary="Update company (admin)")
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise NotFoundError("Company")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=204, summary="Delete company (admin)")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise NotFoundError("Company")
    db.delete(company)
    db.commit()
