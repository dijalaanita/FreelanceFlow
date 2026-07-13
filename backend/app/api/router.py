from fastapi import APIRouter

from app.api.routes import approvals, auth, clients, content, dashboard, invoices

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(content.router)
api_router.include_router(approvals.router)
api_router.include_router(invoices.client_scoped_router)
api_router.include_router(invoices.router)
api_router.include_router(dashboard.router)
