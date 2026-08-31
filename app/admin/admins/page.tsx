"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ErrorResponse = { error: string };

function isErrorResponse(data: unknown): data is ErrorResponse {
  if (!data || typeof data !== "object") return false;
  return (
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  );
}

type SchoolItem = { id: string; name: string };

type AdminItem = {
  id: string;
  username: string;
  schoolId: string;
  isSuperAdmin: boolean;
  createdAt: string;
};

export default function AdminAdminsPage() {
  const router = useRouter();

  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [items, setItems] = useState<AdminItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newSchoolId, setNewSchoolId] = useState("");

  async function bootstrapGuardAndLoad() {
    const meRes = await fetch("/api/admin/me", { credentials: "include" });
    const me = (await meRes.json().catch(() => null)) as unknown;
    const isSuperAdmin = Boolean(
      (me as { isSuperAdmin?: unknown } | null)?.isSuperAdmin
    );

    if (!isSuperAdmin) {
      router.replace("/admin/dashboard");
      return;
    }

    await Promise.all([loadSchools(), loadAdmins()]);
  }

  async function loadSchools() {
    const res = await fetch("/api/admin/schools", { credentials: "include" });
    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) throw new Error(isErrorResponse(data) ? data.error : "Failed to load schools.");

    const loaded = (data as { items?: unknown }).items;
    const list = Array.isArray(loaded) ? (loaded as unknown[]) : [];

    const mapped = list
      .map((x) => {
        const id = String((x as { id?: unknown }).id ?? "");
        const name = String((x as { name?: unknown }).name ?? "");
        return { id, name };
      })
      .filter((x) => x.id && x.name);

    setSchools(mapped);
    if (!newSchoolId && mapped[0]) setNewSchoolId(mapped[0].id);
  }

  async function loadAdmins() {
    const res = await fetch("/api/admin/admins", { credentials: "include" });
    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) throw new Error(isErrorResponse(data) ? data.error : "Failed to load admins.");

    const loaded = (data as { items?: unknown }).items;
    setItems(Array.isArray(loaded) ? (loaded as AdminItem[]) : []);
  }

  async function create() {
    setError(null);

    const username = newUsername.trim();
    const password = newPassword;

    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    if (!newSchoolId) {
      setError("School is required.");
      return;
    }

    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username,
        password,
        schoolId: newSchoolId,
      }),
    });

    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      setError(isErrorResponse(data) ? data.error : "Create failed.");
      return;
    }

    setNewUsername("");
    setNewPassword("");

    await loadAdmins();
  }

  async function patch(id: string, patchBody: Record<string, unknown>) {
    setError(null);

    const res = await fetch(`/api/admin/admins/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patchBody),
    });

    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      setError(isErrorResponse(data) ? data.error : "Update failed.");
      return;
    }

    await loadAdmins();
  }

  async function remove(id: string) {
    setError(null);

    const res = await fetch(`/api/admin/admins/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      setError(isErrorResponse(data) ? data.error : "Delete failed.");
      return;
    }

    await loadAdmins();
  }

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);

      bootstrapGuardAndLoad()
        .catch((e) => setError(String(e)))
        .finally(() => setLoading(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, []);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Admins
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create admins and assign them to schools.
        </p>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Username"
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Password"
            type="password"
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <select
            value={newSchoolId}
            onChange={(e) => setNewSchoolId(e.target.value)}
            disabled={!schools.length}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={create}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Add admin
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">Username</th>
                <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">Role</th>
                <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">School</th>
                <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">Created</th>
                <th className="border-b border-zinc-200 py-3 dark:border-zinc-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="text-sm">
                  <td className="border-b border-zinc-100 py-3 pr-3 font-medium text-zinc-950 dark:border-zinc-900 dark:text-zinc-50">
                    {a.username}
                  </td>
                  <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                    {a.isSuperAdmin ? "Super admin" : "School admin"}
                  </td>
                  <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                    {a.isSuperAdmin ? (
                      <span className="text-zinc-500 dark:text-zinc-400">(all)</span>
                    ) : (
                      <select
                        value={a.schoolId}
                        onChange={(e) => void patch(a.id, { schoolId: e.target.value })}
                        className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      >
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td className="border-b border-zinc-100 py-3 dark:border-zinc-900">
                    <div className="flex gap-2">
                      {!a.isSuperAdmin ? (
                        <button
                          type="button"
                          onClick={() => void remove(a.id)}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-800 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {!items.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-sm text-zinc-600 dark:text-zinc-400">
                    No admins yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
