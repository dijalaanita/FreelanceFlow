"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, clearTokens } from "@/lib/api";

type ContentRecord = {
  id: string;
  title: string;
  platform: string;
  status: string;
  scheduled_date?: string | null;
  client_business_name?: string | null;
};

type InvoiceRecord = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number | string;
  due_date: string;
  client_business_name?: string | null;
};

type DashboardResponse = {
  upcoming_posts: ContentRecord[];
  pending_approvals: ContentRecord[];
  unpaid_invoices: InvoiceRecord[];
};

type Me = { id: string; email: string; full_name: string };

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function formatCurrency(value: number | string | undefined) {
  const numeric = typeof value === "string" ? Number(value.replace(/[^0-9.-]+/g, "")) : value ?? 0;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(
    Number.isFinite(numeric) ? numeric : 0,
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MetricCard({ label, value, note, href, highlighted }: { label: string; value: string; note: string; href: string; highlighted?: boolean }) {
  return (
    <Link href={href} className="group border-b border-zinc-800 p-5 transition last:border-b-0 hover:bg-zinc-900 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:p-6">
      <div className="flex items-start justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-[#d97745]">
          <ArrowIcon />
        </span>
      </div>
      <p className={`mt-7 font-semibold tracking-[-0.04em] ${value.startsWith("₦") ? "text-3xl" : "text-4xl"} ${highlighted ? "text-[#d97745]" : "text-zinc-50"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{note}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, dashRes] = await Promise.all([apiFetch("/api/v1/auth/me"), apiFetch("/api/v1/dashboard")]);

      if (meRes.status === 401 || dashRes.status === 401) {
        clearTokens();
        window.location.href = "/login";
        return;
      }
      if (!meRes.ok) throw new Error("Could not load your profile.");
      if (!dashRes.ok) throw new Error("Could not load your weekly workspace.");

      setMe(await meRes.json());
      setDashboard(await dashRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const posts = dashboard?.upcoming_posts ?? [];
  const approvals = dashboard?.pending_approvals ?? [];
  const invoices = dashboard?.unpaid_invoices ?? [];

  const unpaidTotal = useMemo(
    () => invoices.reduce((total, inv) => total + Number(inv.total_amount ?? 0), 0),
    [invoices],
  );

  const firstName = me?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto min-h-[100dvh] max-w-[1400px] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-[100dvh] border-r border-zinc-800/80 px-5 py-6 lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d97745]">
          <span className="grid size-9 place-items-center rounded-xl bg-[#d97745] text-sm font-bold text-zinc-950">F</span>
          <span className="text-[15px] font-semibold tracking-tight">FreelanceFlow</span>
        </Link>
        <nav aria-label="Workspace navigation" className="mt-10 space-y-1">
          <Link href="/dashboard" aria-current="page" className="block rounded-xl bg-zinc-900 px-3 py-3 text-sm font-medium text-zinc-50">
            This Week
          </Link>
          <Link href="/clients" className="block rounded-xl px-3 py-3 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100">
            Clients
          </Link>
          <Link href="/invoices" className="block rounded-xl px-3 py-3 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100">
            Invoices
          </Link>
        </nav>
        <div className="mt-auto">
          {me && (
            <div className="flex items-center gap-3 rounded-xl p-2">
              <span className="grid size-9 place-items-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-semibold">
                {initials(me.full_name)}
              </span>
              <span>
                <span className="block text-sm font-medium">{me.full_name}</span>
                <span className="block text-xs text-zinc-500">{me.email}</span>
              </span>
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        <main className="px-5 pb-32 pt-8 sm:px-8 lg:px-10 lg:pb-14 lg:pt-12 xl:px-14">
          <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#d97745]">This week</p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                Good morning, {firstName}.<br />
                <span className="font-normal text-zinc-500">Here&apos;s what needs your eye.</span>
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <Link href="/clients" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#d97745] px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-[#e18a5c]">
                <PlusIcon /> Add content
              </Link>
              <Link href="/clients" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium transition hover:bg-zinc-800">
                Onboard client
              </Link>
            </div>
          </section>

          <div className="mt-12">
            {loading ? (
              <div role="status" aria-label="Loading dashboard" className="space-y-8">
                <div className="grid gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 sm:grid-cols-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-40 animate-pulse bg-zinc-900" />
                  ))}
                </div>
              </div>
            ) : error ? (
              <section role="alert" className="rounded-2xl border border-[#d97745]/40 bg-[#d97745]/10 p-6">
                <p className="font-medium text-zinc-100">Dashboard unavailable</p>
                <p className="mt-2 text-sm text-zinc-400">{error}</p>
                <button type="button" onClick={() => void load()} className="mt-5 rounded-xl bg-[#d97745] px-4 py-2.5 text-sm font-semibold text-zinc-950">
                  Try again
                </button>
              </section>
            ) : (
              <>
                <section>
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Priority summary</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">Your week at a glance</h2>
                  </div>
                  <div className="grid overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 sm:grid-cols-3">
                    <MetricCard label="Upcoming posts" value={String(posts.length)} note="Scheduled across active clients" href="/dashboard" />
                    <MetricCard label="Pending approvals" value={String(approvals.length)} note="Waiting on client feedback" href="/dashboard" highlighted />
                    <MetricCard label="Unpaid invoices" value={formatCurrency(unpaidTotal)} note={`Across ${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`} href="/invoices" />
                  </div>
                </section>

                <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                  <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
                    <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 sm:px-6">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#d97745]">Action needed</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight">Needs attention</h2>
                      </div>
                      <span className="grid size-7 place-items-center rounded-full bg-[#d97745]/15 text-xs font-semibold text-[#d97745]">
                        {approvals.length + invoices.length}
                      </span>
                    </header>
                    {approvals.length + invoices.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <p className="font-medium text-zinc-200">Everything is clear.</p>
                        <p className="mt-1 text-sm text-zinc-500">New approvals and unpaid invoices will appear here.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-800">
                        {approvals.slice(0, 3).map((item) => (
                          <div key={item.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-6">
                            <span className="hidden size-2 rounded-full bg-[#d97745] sm:block" />
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-zinc-100">{item.title}</span>
                                <span className="rounded-md border border-[#d97745]/30 bg-[#d97745]/10 px-2 py-0.5 text-[11px] font-medium text-[#d97745]">
                                  {item.status}
                                </span>
                              </span>
                              <span className="mt-1 block text-sm text-zinc-500">
                                {item.client_business_name ?? "Client"} · {item.platform}
                              </span>
                            </span>
                          </div>
                        ))}
                        {invoices.slice(0, 2).map((inv) => (
                          <div key={inv.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-6">
                            <span className="hidden size-2 rounded-full bg-[#d97745] sm:block" />
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-zinc-100">Invoice {inv.invoice_number}</span>
                                <span className="rounded-md border border-[#d97745]/30 bg-[#d97745]/10 px-2 py-0.5 text-[11px] font-medium text-[#d97745]">
                                  Unpaid
                                </span>
                              </span>
                              <span className="mt-1 block text-sm text-zinc-500">
                                {inv.client_business_name ?? "Client"} · {formatCurrency(inv.total_amount)} · due {inv.due_date}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section aria-labelledby="upcoming-heading">
                    <header className="mb-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Schedule</p>
                        <h2 id="upcoming-heading" className="mt-1 text-xl font-semibold tracking-tight">
                          Upcoming content
                        </h2>
                      </div>
                    </header>
                    {posts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-zinc-700 p-8">
                        <p className="font-medium">Nothing scheduled yet.</p>
                        <p className="mt-1 text-sm text-zinc-500">Add your next post to start shaping the week.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {posts.slice(0, 5).map((post) => (
                          <div key={post.id} className="grid grid-cols-[52px_minmax(0,1fr)] gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                            <span className="flex h-14 flex-col items-center justify-center rounded-xl bg-zinc-800">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                {post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString("en-NG", { weekday: "short" }) : "TBD"}
                              </span>
                              <span className="text-lg font-semibold">
                                {post.scheduled_date ? new Date(post.scheduled_date).getDate() : "--"}
                              </span>
                            </span>
                            <span className="min-w-0 self-center">
                              <span className="block truncate text-sm font-medium">{post.title}</span>
                              <span className="mt-1 block truncate text-xs text-zinc-500">
                                {post.client_business_name ?? "Client"} · {post.platform}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
