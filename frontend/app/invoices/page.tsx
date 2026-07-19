"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number | string;
  issued_date: string;
  due_date: string;
  client_business_name?: string | null;
};

function formatCurrency(value: number | string | undefined) {
  const numeric = typeof value === "string" ? Number(value.replace(/[^0-9.-]+/g, "")) : value ?? 0;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(
    Number.isFinite(numeric) ? numeric : 0,
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/v1/invoices");
      if (!res.ok) throw new Error("Could not load invoices.");
      setInvoices(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markPaid(invoiceId: string) {
    setMarkingPaidId(invoiceId);
    try {
      const res = await apiFetch(`/api/v1/invoices/${invoiceId}/mark-paid`, { method: "PATCH" });
      if (!res.ok) throw new Error("Could not update this invoice.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setMarkingPaidId(null);
    }
  }

  const unpaid = invoices.filter((inv) => inv.status === "Unpaid");
  const paid = invoices.filter((inv) => inv.status === "Paid");

  return (
    <AppShell>
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#d97745]">Billing</p>
        <h1 className="text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-5xl">Invoices</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Create invoices from a client&apos;s page. Mark them paid here once you&apos;ve been paid.
        </p>
      </section>

      <div className="mt-10">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 animate-pulse rounded-2xl bg-zinc-900" />
            ))}
          </div>
        ) : error ? (
          <section role="alert" className="rounded-2xl border border-[#d97745]/40 bg-[#d97745]/10 p-6">
            <p className="font-medium text-zinc-100">Couldn&apos;t load invoices</p>
            <p className="mt-2 text-sm text-zinc-400">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-[#d97745] px-4 py-2.5 text-sm font-semibold text-zinc-950">
              Try again
            </button>
          </section>
        ) : invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-10 text-center">
            <p className="font-medium text-zinc-200">No invoices yet.</p>
            <p className="mt-1 text-sm text-zinc-500">Open a client to create your first invoice.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {unpaid.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-medium text-zinc-400">Unpaid ({unpaid.length})</h2>
                <div className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/30">
                  {unpaid.map((inv) => (
                    <div key={inv.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-100">{inv.invoice_number}</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {inv.client_business_name ?? "Client"} · due {inv.due_date}
                        </p>
                      </div>
                      <p className="font-semibold text-zinc-100">{formatCurrency(inv.total_amount)}</p>
                      <button
                        type="button"
                        onClick={() => void markPaid(inv.id)}
                        disabled={markingPaidId === inv.id}
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium transition hover:bg-zinc-800 disabled:opacity-60"
                      >
                        {markingPaidId === inv.id ? "Updating…" : "Mark paid"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {paid.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-medium text-zinc-400">Paid ({paid.length})</h2>
                <div className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/30">
                  {paid.map((inv) => (
                    <div key={inv.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-100">{inv.invoice_number}</p>
                        <p className="mt-1 text-sm text-zinc-500">{inv.client_business_name ?? "Client"}</p>
                      </div>
                      <p className="font-semibold text-zinc-400">{formatCurrency(inv.total_amount)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
