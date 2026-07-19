"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

type ClientDetail = {
  client: { id: string; business_name: string; contact_email: string; contact_phone?: string | null };
  onboarding_data?: {
    id: string;
    brand_voice_notes?: string | null;
    rate_card_description?: string | null;
  } | null;
};

type ContentItem = {
  id: string;
  title: string;
  content_text?: string | null;
  platform: string;
  scheduled_date?: string | null;
  status: string;
};

const PLATFORMS = ["Instagram", "Twitter", "LinkedIn", "TikTok", "Facebook", "YouTube"];

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showContentForm, setShowContentForm] = useState(false);
  const [title, setTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [submittingContent, setSubmittingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [lastApprovalLink, setLastApprovalLink] = useState<string | null>(null);

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [invoiceQuantity, setInvoiceQuantity] = useState("1");
  const [invoiceUnitPrice, setInvoiceUnitPrice] = useState("");
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, itemsRes] = await Promise.all([
        apiFetch(`/api/v1/clients/${clientId}`),
        apiFetch(`/api/v1/clients/${clientId}/content-items`),
      ]);
      if (!detailRes.ok) throw new Error("Could not load this client.");
      if (!itemsRes.ok) throw new Error("Could not load content items.");
      setDetail(await detailRes.json());
      setItems(await itemsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAddContent(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingContent(true);
    setContentError(null);
    setLastApprovalLink(null);
    try {
      const res = await apiFetch(`/api/v1/clients/${clientId}/content-items`, {
        method: "POST",
        body: JSON.stringify({
          title,
          content_text: contentText || undefined,
          platform,
          scheduled_date: scheduledDate || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Could not create this content item.");
      }
      const data = await res.json();
      setLastApprovalLink(`${window.location.origin}/approve/${data.approval_token}`);
      setTitle("");
      setContentText("");
      setScheduledDate("");
      setShowContentForm(false);
      await load();
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmittingContent(false);
    }
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingInvoice(true);
    setInvoiceError(null);
    setInvoiceSuccess(null);
    try {
      const res = await apiFetch(`/api/v1/clients/${clientId}/invoices`, {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              description: invoiceDescription,
              item_type: "retainer",
              quantity: Number(invoiceQuantity) || 1,
              unit_price: Number(invoiceUnitPrice) || 0,
            },
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Could not create this invoice.");
      }
      const invoice = await res.json();
      setInvoiceSuccess(`Invoice ${invoice.invoice_number} created.`);
      setInvoiceDescription("");
      setInvoiceQuantity("1");
      setInvoiceUnitPrice("");
      setShowInvoiceForm(false);
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmittingInvoice(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-900" />
      </AppShell>
    );
  }

  if (error || !detail) {
    return (
      <AppShell>
        <section role="alert" className="rounded-2xl border border-[#d97745]/40 bg-[#d97745]/10 p-6">
          <p className="font-medium text-zinc-100">Couldn&apos;t load this client</p>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-[#d97745] px-4 py-2.5 text-sm font-semibold text-zinc-950">
            Try again
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link href="/clients" className="text-sm text-zinc-500 hover:text-zinc-300">← All clients</Link>

      <section className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#d97745]">Client</p>
          <h1 className="text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-5xl">{detail.client.business_name}</h1>
          <p className="mt-2 text-sm text-zinc-500">{detail.client.contact_email}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowContentForm((v) => !v)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#d97745] px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-[#e18a5c]"
          >
            {showContentForm ? "Cancel" : "Add content"}
          </button>
          <button
            type="button"
            onClick={() => setShowInvoiceForm((v) => !v)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium transition hover:bg-zinc-800"
          >
            {showInvoiceForm ? "Cancel" : "New invoice"}
          </button>
        </div>
      </section>

      {(detail.onboarding_data?.brand_voice_notes || detail.onboarding_data?.rate_card_description) && (
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {detail.onboarding_data?.brand_voice_notes && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Brand voice</p>
              <p className="mt-2 text-sm text-zinc-300">{detail.onboarding_data.brand_voice_notes}</p>
            </div>
          )}
          {detail.onboarding_data?.rate_card_description && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Rate card</p>
              <p className="mt-2 text-sm text-zinc-300">{detail.onboarding_data.rate_card_description}</p>
            </div>
          )}
        </section>
      )}

      {lastApprovalLink && (
        <div className="mt-8 rounded-2xl border border-[#d97745]/40 bg-[#d97745]/10 p-5">
          <p className="text-sm font-medium text-zinc-100">Content created. Share this approval link with your client:</p>
          <p className="mt-2 break-all rounded-lg bg-zinc-950/60 px-3 py-2 text-sm text-[#e18a5c]">{lastApprovalLink}</p>
        </div>
      )}

      {invoiceSuccess && (
        <div className="mt-8 rounded-2xl border border-[#d97745]/40 bg-[#d97745]/10 p-5 text-sm text-zinc-100">{invoiceSuccess}</div>
      )}

      {showContentForm && (
        <form onSubmit={handleAddContent} className="mt-8 max-w-xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm text-zinc-400">Title</label>
            <input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
            />
          </div>
          <div>
            <label htmlFor="contentText" className="mb-1.5 block text-sm text-zinc-400">Caption / content (optional)</label>
            <textarea
              id="contentText"
              rows={4}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="platform" className="mb-1.5 block text-sm text-zinc-400">Platform</label>
              <select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="scheduledDate" className="mb-1.5 block text-sm text-zinc-400">Scheduled date (optional)</label>
              <input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
              />
            </div>
          </div>
          {contentError && <p className="text-sm text-[#e18a5c]">{contentError}</p>}
          <button
            type="submit"
            disabled={submittingContent}
            className="rounded-xl bg-[#d97745] px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-[#e18a5c] disabled:opacity-60"
          >
            {submittingContent ? "Creating…" : "Create content"}
          </button>
        </form>
      )}

      {showInvoiceForm && (
        <form onSubmit={handleCreateInvoice} className="mt-8 max-w-xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
          <div>
            <label htmlFor="invoiceDescription" className="mb-1.5 block text-sm text-zinc-400">Line item description</label>
            <input
              id="invoiceDescription"
              required
              placeholder="e.g. Monthly retainer — July"
              value={invoiceDescription}
              onChange={(e) => setInvoiceDescription(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="invoiceQuantity" className="mb-1.5 block text-sm text-zinc-400">Quantity</label>
              <input
                id="invoiceQuantity"
                type="number"
                min={1}
                required
                value={invoiceQuantity}
                onChange={(e) => setInvoiceQuantity(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
              />
            </div>
            <div>
              <label htmlFor="invoiceUnitPrice" className="mb-1.5 block text-sm text-zinc-400">Unit price</label>
              <input
                id="invoiceUnitPrice"
                type="number"
                min={0}
                step="0.01"
                required
                value={invoiceUnitPrice}
                onChange={(e) => setInvoiceUnitPrice(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
              />
            </div>
          </div>
          {invoiceError && <p className="text-sm text-[#e18a5c]">{invoiceError}</p>}
          <button
            type="submit"
            disabled={submittingInvoice}
            className="rounded-xl bg-[#d97745] px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-[#e18a5c] disabled:opacity-60"
          >
            {submittingInvoice ? "Creating…" : "Create invoice"}
          </button>
        </form>
      )}

      <section className="mt-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Content calendar</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Content items</h2>

        {items.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-700 p-8">
            <p className="font-medium">No content yet.</p>
            <p className="mt-1 text-sm text-zinc-500">Add a post to start this client&apos;s calendar.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/30">
            {items.map((item) => (
              <div key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-100">{item.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.platform} {item.scheduled_date ? `· ${item.scheduled_date}` : ""}
                  </p>
                </div>
                <span className="w-fit rounded-md border border-[#d97745]/30 bg-[#d97745]/10 px-2 py-0.5 text-[11px] font-medium text-[#d97745]">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
