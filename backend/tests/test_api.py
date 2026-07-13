import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("APP_ENV", "test")

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import init_models
from app.main import app


@pytest.fixture(autouse=True, scope="module")
async def setup_db():
    await init_models()
    from scripts.seed import seed

    await seed()
    yield


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    register = await client.post(
        "/api/v1/auth/register",
        json={"email": "amara@studio.co", "password": "supersecret1", "full_name": "Amara Okafor"},
    )
    assert register.status_code == 200
    assert register.json()["email"] == "amara@studio.co"

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "amara@studio.co", "password": "supersecret1"},
    )
    assert login.status_code == 200
    body = login.json()
    assert "access_token" in body
    assert "refresh_token" in body


@pytest.mark.asyncio
async def test_freemium_client_limit(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "one-client@studio.co", "password": "supersecret1", "full_name": "Solo Freelancer"},
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "one-client@studio.co", "password": "supersecret1"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    first = await client.post(
        "/api/v1/clients",
        json={"business_name": "Luma Skin", "contact_email": "hello@luma.co"},
        headers=headers,
    )
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/clients",
        json={"business_name": "Kora Studio", "contact_email": "hi@kora.co"},
        headers=headers,
    )
    assert second.status_code == 403
