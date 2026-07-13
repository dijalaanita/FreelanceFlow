from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="FreelanceFlow API",
    description="A calm, mobile-first workspace API for solo freelance social-media managers.",
    version="1.0.0",
)

# Review finding #10: CORS was unconfigured. Restricted to known frontend origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def on_startup():
    # Convenience for local/dev use with sqlite; in production run
    # `alembic upgrade head` + `python -m scripts.seed` explicitly instead.
    if settings.app_env == "development":
        from app.core.database import init_models

        await init_models()
