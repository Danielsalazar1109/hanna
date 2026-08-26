"use client";

import { useMemo, useState } from "react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = useMemo(() => {
    if (typeof window === "undefined") return "/admin/dashboard";
    const url = new URL(window.location.href);
    return url.searchParams.get("next") ?? "/admin/dashboard";
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok: true }
        | { error: string }
        | null;

      if (!res.ok || !data || "error" in data) {
        throw new Error(data && "error" in data ? data.error : "Login failed.");
      }

      window.location.assign(next);
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Admin login
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Sign in to manage appointments.
        </p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              autoComplete="username"
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
