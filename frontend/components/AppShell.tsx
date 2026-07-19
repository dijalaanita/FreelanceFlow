"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearTokens } from "@/lib/api";

type Me = { id: string; email: string; full_name: string };

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const NAV = [
  { href: "/dashboard", label: "This Week" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/v1/auth/me").then(async (res) => {
      if (res.status === 401) {
        clearTokens();
        window.location.href = "/login";
        return;
      }
      if (res.ok && !cancelled) setMe(await res.json());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto min-h-[100dvh] max-w-[1400px] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-[100dvh] border-r border-zinc-800/80 px-5 py-6 lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d97745]">
          <span className="grid size-9 place-items-center rounded-xl bg-[#d97745] text-sm font-bold text-zinc-950">F</span>
          <span className="text-[15px] font-semibold tracking-tight">FreelanceFlow</span>
        </Link>
        <nav aria-label="Workspace navigation" className="mt-10 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-xl px-3 py-3 text-sm transition ${
                  active ? "bg-zinc-900 font-medium text-zinc-50" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2">
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
          <button
            type="button"
            onClick={() => {
              clearTokens();
              window.location.href = "/login";
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-4 py-3 lg:hidden">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-zinc-900 font-medium text-zinc-50" : "text-zinc-400"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="px-5 pb-32 pt-8 sm:px-8 lg:px-10 lg:pb-14 lg:pt-12 xl:px-14">{children}</main>
      </div>
    </div>
  );
}
