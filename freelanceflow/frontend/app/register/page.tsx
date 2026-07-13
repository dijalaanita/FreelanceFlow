"use client";

import Link from "next/link";
import { useState } from "react";
import { API_URL, setTokens } from "@/lib/api";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const registerRes = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, password }),
      });
      if (!registerRes.ok) {
        const body = await registerRes.json().catch(() => null);
        throw new Error(body?.detail ?? "Could not create your account.");
      }

      const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await loginRes.json();
      setTokens(data.access_token, data.refresh_token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-[#d97745] text-sm font-bold text-zinc-950">F</span>
        <span className="text-[15px] font-semibold tracking-tight">FreelanceFlow</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Set up your workspace</h1>
      <p className="mt-2 text-sm text-zinc-500">Free plan includes 1 client and every core feature.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-sm text-zinc-400">Full name</label>
          <input
            id="fullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm text-zinc-400">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm text-zinc-400">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
          />
          <p className="mt-1.5 text-xs text-zinc-500">At least 8 characters.</p>
        </div>
        {error && <p className="text-sm text-[#e18a5c]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#d97745] px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-[#e18a5c] disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#d97745] hover:text-[#e18a5c]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
