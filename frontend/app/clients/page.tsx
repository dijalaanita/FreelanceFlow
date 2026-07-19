"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

type Client = {
  id: string;
  business_name: string;
  contact_email: string;
  contact_phone?: string | null;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [brandVoiceNotes, setBrandVoiceNotes] = useState("");
  const [rateCardDescription, setRateCardDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiFetch("/api/v1/clients");
      if (!res.ok) throw new Error("Could not load clients.");
      setClients(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await apiFetch("/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          business_name: businessName,
          contact_email: contactEmail,
          contact_phone: contactPhone || undefined,
          brand_voice_notes: brandVoiceNotes || undefined,
          rate_card_description: rateCardDescription || undefined,
        }),
      });
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Free plan is limited to 1 client. Upgrade to add more.");
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Could not add this client.");
      }
      setBusinessName("");
      setContactEmail("");
      setContactPhone("");
      setBrandVoiceNotes("");
      setRateCardDescription("");
      setShowForm(false);
      await loadClients();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#d97745]">Clients</p>
          <h1 className="text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-5xl">Your clients</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#d97745] px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-[#e18a5c]"
        >
          {showForm ? "Cancel" : "Add client"}
        </button>
      </section>

      {showForm && (
        <form onSubmit={handleAddClient} className="mt-8 max-w-xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
          <div>
            <label htmlFor="businessName" className="mb-1.5 block text-sm text-zinc-400">Business name</label>
            <input
              id="businessName"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className="mb-1.5 block text-sm text-zinc-400">Contact email</label>
            <input
              id="contactEmail"
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
            />
          </div>
          <div>
            <label htmlFor="contactPhone" className="mb-1.5 block text-sm text-zinc-400">Contact phone (optional)</label>
            <input
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
            />
          </div>
          <div>
            <label htmlFor="brandVoiceNotes" className="mb-1.5 block text-sm text-zinc-400">Brand voice notes (optional)</label>
            <textarea
              id="brandVoiceNotes"
              rows={3}
              value={brandVoiceNotes}
              onChange={(e) => setBrandVoiceNotes(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
            />
          </div>
          <div>
            <label htmlFor="rateCardDescription" className="mb-1.5 block text-sm text-zinc-400">Rate card description (optional)</label>
            <textarea
              id="rateCardDescription"
              rows={3}
              value={rateCardDescription}
              onChange={(e) => setRateCardDescription(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
            />
          </div>
          {formError && <p className="text-sm text-[#e18a5c]">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-[#d97745] px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-[#e18a5c] disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save client"}
          </button>
        </form>
      )}

      <div className="mt-10">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 animate-pulse rounded-2xl bg-zinc-900" />
            ))}
          </div>
        ) : loadError ? (
          <section role="alert" className="rounded-2xl border border-[#d97745]/40 bg-[#d97745]/10 p-6">
            <p className="font-medium text-zinc-100">Couldn&apos;t load clients</p>
            <p className="mt-2 text-sm text-zinc-400">{loadError}</p>
            <button type="button" onClick={() => void loadClients()} className="mt-5 rounded-xl bg-[#d97745] px-4 py-2.5 text-sm font-semibold text-zinc-950">
              Try again
            </button>
          </section>
        ) : clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-10 text-center">
            <p className="font-medium text-zinc-200">No clients yet.</p>
            <p className="mt-1 text-sm text-zinc-500">Add your first client to start building their content calendar.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                <p className="font-semibold tracking-tight">{client.business_name}</p>
                <p className="mt-1 text-sm text-zinc-500">{client.contact_email}</p>
                {client.contact_phone && <p className="mt-1 text-sm text-zinc-500">{client.contact_phone}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
