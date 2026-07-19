import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.api.deps import get_current_user, get_owned_client
from app.core.database import get_session
from app.models import Client, Invoice, InvoiceItem, User
from app.schemas import InvoiceCreate, InvoiceOut

client_scoped_router = APIRouter(prefix="/clients/{client_id}/invoices", tags=["invoices"])
router = APIRouter(prefix="/invoices", tags=["invoices"])


@client_scoped_router.post("", response_model=InvoiceOut, status_code=201)
async def create_invoice(
    invoice_in: InvoiceCreate,
    client: Client = Depends(get_owned_client),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    total = sum(i.quantity * i.unit_price for i in invoice_in.items)
    invoice = Invoice(
        client_id=client.id,
        user_id=user.id,
        invoice_number=f"FF-{uuid.uuid4().hex[:8].upper()}",
        status="Unpaid",
        total_amount=total,
        issued_date=date.today(),
        due_date=invoice_in.due_date or (date.today() + timedelta(days=14)),
    )
    session.add(invoice)
    await session.flush()

    for item in invoice_in.items:
        # Review finding #8: line_total is always computed server-side,
        # never trusted from the client, so it can't drift from qty*price.
        session.add(
            InvoiceItem(
                invoice_id=invoice.id,
                description=item.description,
                item_type=item.item_type,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.quantity * item.unit_price,
            )
        )

    await session.commit()
    await session.refresh(invoice)
    return InvoiceOut(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        total_amount=invoice.total_amount,
        issued_date=invoice.issued_date,
        due_date=invoice.due_date,
        client_business_name=client.business_name,
    )


@router.get("", response_model=list[InvoiceOut])
async def list_invoices(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(select(Invoice).where(Invoice.user_id == user.id))
    invoices = result.all()
    out = []
    for invoice in invoices:
        client = await session.get(Client, invoice.client_id)
        out.append(
            InvoiceOut(
                id=invoice.id,
                invoice_number=invoice.invoice_number,
                status=invoice.status,
                total_amount=invoice.total_amount,
                issued_date=invoice.issued_date,
                due_date=invoice.due_date,
                client_business_name=client.business_name if client else None,
            )
        )
    return out


@router.patch("/{invoice_id}/mark-paid", response_model=InvoiceOut)
async def mark_invoice_paid(
    invoice_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    from fastapi import HTTPException

    invoice = await session.get(Invoice, invoice_id)
    if not invoice or invoice.user_id != user.id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = "Paid"
    session.add(invoice)
    await session.commit()
    await session.refresh(invoice)
    client = await session.get(Client, invoice.client_id)
    return InvoiceOut(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        total_amount=invoice.total_amount,
        issued_date=invoice.issued_date,
        due_date=invoice.due_date,
        client_business_name=client.business_name if client else None,
    )
