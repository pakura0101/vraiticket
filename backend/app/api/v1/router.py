from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, companies, groups, tickets, admin

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(companies.router)
router.include_router(groups.router)
router.include_router(tickets.router)
router.include_router(admin.router)
