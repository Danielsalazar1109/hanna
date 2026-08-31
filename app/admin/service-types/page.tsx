"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ServiceTypeItem = {
  id: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
};

type ErrorResponse = { error: string };

function isErrorResponse(data: unknown): data is ErrorResponse {
  if (!data || typeof data !== "object") return false;
  return (
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  );
}

export default function AdminServiceTypesPage() {
  const router = useRouter();

  const [items, setItems] = useState<ServiceTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSortOrder, setNewSortOrder] = useState("0");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/service-types", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        throw new Error(
          isErrorResponse(data) ? data.error : "Failed to load service types."
        );
      }

      const loaded = (data as { items?: unknown }).items;
      setItems(Array.isArray(loaded) ? (loaded as ServiceTypeItem[]) : []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setError(null);

    const name = newName.trim();
    const sortOrder = Number(newSortOrder);

    if (!name) {
      setError("Name is required.");
      return;
    }

    const res = await fetch("/api/admin/service-types", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 }),
    });

    const data = (await res.json().catch(() => null)) as unknown;

    if (!res.ok) {
      setError(isErrorResponse(data) ? data.error : "Create failed.");
      return;
    }

    setNewName("");
    setNewSortOrder("0");
    await load();
  }

  async function patch(id: string, patchBody: Partial<ServiceTypeItem>) {
    setError(null);

    const res = await fetch(`/api/admin/service-types/${id}`, {
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

    await load();
  }

  async function remove(id: string) {
    setError(null);

    const res = await fetch(`/api/admin/service-types/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      setError(isErrorResponse(data) ? data.error : "Delete failed.");
      return;
    }

    await load();
  }

  useEffect(() => {
    // Defer so we don't setState synchronously inside the effect body.
    queueMicrotask(() => {
      fetch("/api/admin/me", { credentials: "include" })
        .then((r) => r.json().catch(() => null))
        .then((data: unknown) => {
          const isSuperAdmin = Boolean(
            (data as { isSuperAdmin?: unknown } | null)?.isSuperAdmin
          );
          if (!isSuperAdmin) {
            router.replace("/admin/dashboard");
            return;
          }
          void load();
        })
        .catch(() => {
          router.replace("/admin/dashboard");
        });
    });
  }, [router]);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Service types
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Add/edit service types shown to students when booking.
        </p>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New service type name"
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <input
            value={newSortOrder}
            onChange={(e) => setNewSortOrder(e.target.value)}
            placeholder="Sort order"
            inputMode="numeric"
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <button
            type="button"
            onClick={create}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Add
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[700px] border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                  Name
                </th>
                <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                  Sort
                </th>
                <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                  Enabled
                </th>
                <th className="border-b border-zinc-200 py-3 dark:border-zinc-800">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    Loading…
                  </td>
                </tr>
              ) : items.length ? (
                items.map((it) => (
                  <tr key={it.id} className="text-sm">
                    <td className="border-b border-zinc-100 py-3 pr-3 font-medium text-zinc-950 dark:border-zinc-900 dark:text-zinc-50">
                      <input
                        defaultValue={it.name}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== it.name) void patch(it.id, { name: v });
                        }}
                        className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      />
                    </td>
                    <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                      <input
                        defaultValue={String(it.sortOrder)}
                        inputMode="numeric"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v !== it.sortOrder) {
                            void patch(it.id, { sortOrder: v });
                          }
                        }}
                        className="h-9 w-28 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      />
                    </td>
                    <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                      <button
                        type="button"
                        onClick={() => void patch(it.id, { enabled: !it.enabled })}
                        className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold ${
                          it.enabled
                            ? "bg-emerald-600 text-white hover:bg-emerald-500"
                            : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                        }`}
                      >
                        {it.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td className="border-b border-zinc-100 py-3 dark:border-zinc-900">
                      <button
                        type="button"
                        onClick={() => void remove(it.id)}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-800 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    No service types yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
