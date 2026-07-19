from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.api.deps import get_current_user, get_owned_client
from app.core.database import get_session
from app.models import Client, OnboardingData, SubscriptionTier, User
from app.schemas import ClientCreate, ClientDetailOut, ClientOut, OnboardingIn, OnboardingOut

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientOut])
async def list_clients(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(select(Client).where(Client.user_id == user.id))
    return result.all()


@router.post("", response_model=ClientDetailOut, status_code=201)
async def create_client(
    client_in: ClientCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    tier = await session.get(SubscriptionTier, user.subscription_tier_id)

    # Review finding #5: count via SQL, don't materialize every row.
    client_count = await session.scalar(
        select(func.count()).select_from(Client).where(Client.user_id == user.id)
    )
    if client_count >= tier.max_clients:
        raise HTTPException(
            status_code=403,
            detail="Free plan is limited to 1 client. Upgrade to add more.",
        )

    client = Client(
        user_id=user.id,
        business_name=client_in.business_name,
        contact_email=client_in.contact_email,
        contact_phone=client_in.contact_phone,
    )
    session.add(client)
    await session.flush()

    onboarding = OnboardingData(
        client_id=client.id,
        brand_voice_notes=client_in.brand_voice_notes,
        rate_card_description=client_in.rate_card_description,
    )
    session.add(onboarding)
    await session.commit()
    await session.refresh(client)
    await session.refresh(onboarding)
    return ClientDetailOut(client=client, onboarding_data=onboarding)


@router.get("/{client_id}", response_model=ClientDetailOut)
async def get_client(
    client: Client = Depends(get_owned_client),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(OnboardingData).where(OnboardingData.client_id == client.id)
    )
    onboarding = result.first()
    return ClientDetailOut(client=client, onboarding_data=onboarding)


@router.patch("/{client_id}/onboarding", response_model=OnboardingOut)
async def update_onboarding(
    onboarding_in: OnboardingIn,
    client: Client = Depends(get_owned_client),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(OnboardingData).where(OnboardingData.client_id == client.id)
    )
    onboarding = result.first()
    if not onboarding:
        onboarding = OnboardingData(client_id=client.id)

    if onboarding_in.brand_voice_notes is not None:
        onboarding.brand_voice_notes = onboarding_in.brand_voice_notes
    if onboarding_in.rate_card_description is not None:
        onboarding.rate_card_description = onboarding_in.rate_card_description

    session.add(onboarding)
    await session.commit()
    await session.refresh(onboarding)
    return onboarding
