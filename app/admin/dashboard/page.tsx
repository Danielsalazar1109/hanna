"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ServiceTypeItem = { id: string; name: string; sortOrder: number };

type Appointment = {
  _id: string;
  ticketSeq: number;
  ticketNumber: string;
  studentName: string;
  studentId: string;
  studentNumber: string;
  school?: string;
  serviceType?: string;
  status: "Scheduled" | "Completed" | "Cancelled" | "No Show";
  createdAt: string;
  etaUntil?: string;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
};

type ErrorResponse = { error: string };

type StatsResponse = {
  totalAppointments: number;
  todaysAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
};

type AppointmentsResponse = {
  items: Appointment[];
  total: number;
  page: number;
  limit: number;
};

function isErrorResponse(data: unknown): data is ErrorResponse {
  if (!data || typeof data !== "object") return false;
  return (
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  );
}

const STATUSES: Appointment["status"][] = [
  "Scheduled",
  "Completed",
  "Cancelled",
  "No Show",
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {children}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [nowMs, setNowMs] = useState<number | null>(null);
  const [etaEdits, setEtaEdits] = useState<Record<string, string>>({});

  const [stats, setStats] = useState<StatsResponse | null>(null);

  const [serviceTypes, setServiceTypes] = useState<ServiceTypeItem[]>([]);
  const [serviceTypesError, setServiceTypesError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    q: "",
    date: "",
    status: "",
    studentId: "",
    ticketNumber: "",
    serviceType: "",
  });

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  const appointmentQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.q) p.set("q", filters.q);
    if (filters.date) p.set("date", filters.date);
    if (filters.status) p.set("status", filters.status);
    if (filters.studentId) p.set("studentId", filters.studentId);
    if (filters.ticketNumber) p.set("ticketNumber", filters.ticketNumber);
    if (filters.serviceType) p.set("serviceType", filters.serviceType);
    return p.toString();
  }, [filters]);

  function remainingSecondsFor(a: Appointment): number | null {
    if (nowMs === null) return null;
    if (!a.etaUntil) return null;
    const etaMs = new Date(a.etaUntil).getTime();
    return Math.max(0, Math.ceil((etaMs - nowMs) / 1000));
  }

  function remainingMinutesFor(a: Appointment): number | null {
    const secs = remainingSecondsFor(a);
    if (secs === null) return null;
    return Math.max(0, Math.ceil(secs / 60));
  }

  async function loadStats() {
    const p = new URLSearchParams();
    if (filters.serviceType) p.set("serviceType", filters.serviceType);

    const res = await fetch(`/api/admin/stats?${p.toString()}`, {
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      throw new Error(isErrorResponse(data) ? data.error : "Failed to load stats.");
    }
    setStats(data as StatsResponse);
  }

  async function loadServiceTypes() {
    setServiceTypesError(null);

    try {
      const res = await fetch("/api/student/service-types");
      const data = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        throw new Error(
          isErrorResponse(data) ? data.error : "Failed to load service types."
        );
      }

      const items = (data as { items?: unknown } | null)?.items;
      const list = Array.isArray(items) ? (items as ServiceTypeItem[]) : [];
      setServiceTypes(list);

      // Default to first service type (mini-dashboard model).
      if (!filters.serviceType && list[0]?.name) {
        setFilters((f) => ({ ...f, serviceType: list[0]!.name }));
      }
    } catch (e) {
      setServiceTypesError(String(e));
    }
  }

  async function loadAppointments() {
    setAppointmentsLoading(true);
    setAppointmentsError(null);

    try {
      const res = await fetch(`/api/admin/appointments?${appointmentQuery}`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        throw new Error(
          isErrorResponse(data) ? data.error : "Failed to load appointments."
        );
      }

      const items = (data as Partial<AppointmentsResponse> | null)?.items;
      setAppointments(Array.isArray(items) ? (items as Appointment[]) : []);
    } catch (e) {
      setAppointmentsError(String(e));
    } finally {
      setAppointmentsLoading(false);
    }
  }

  async function updateAppointmentStatus(id: string, status: Appointment["status"]) {
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
      credentials: "include",
    });

    await Promise.all([loadAppointments(), loadStats()]).catch(() => {});
  }

  async function updateAppointmentEta(id: string, minutesRemaining: number) {
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ etaMinutesRemaining: minutesRemaining }),
      credentials: "include",
    });

    await loadAppointments().catch(() => {});
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/");
  }

  useEffect(() => {
    // Load service types once on mount.
    queueMicrotask(() => {
      void loadServiceTypes();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial + serviceType refresh
    loadStats().catch(() => {});
  }, [filters.serviceType]);

  useEffect(() => {
    // Keep a ticking "now" for remaining time rendering.
    const tick = () => setNowMs(Date.now());
    queueMicrotask(tick);
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching is an intended effect
    loadAppointments().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentQuery]);



  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full lg:w-60">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Service Types
          </div>

          {serviceTypesError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {serviceTypesError}
            </div>
          ) : null}

          <div className="mt-3 grid gap-2">
            {serviceTypes.map((t) => {
              const selected = filters.serviceType === t.name;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, serviceType: t.name }))}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                    selected
                      ? "border-blue-700 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                      : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Admin queue dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {filters.serviceType
              ? `Showing: ${filters.serviceType} • Students are served in ticket order.`
              : "Students are served in ticket order."}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Log out
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card title="Total">{stats?.totalAppointments ?? "—"}</Card>
        <Card title="Today">{stats?.todaysAppointments ?? "—"}</Card>
        <Card title="Scheduled">{stats?.scheduledAppointments ?? "—"}</Card>
        <Card title="Completed">{stats?.completedAppointments ?? "—"}</Card>
        <Card title="Cancelled">{stats?.cancelledAppointments ?? "—"}</Card>
      </div>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 lg:grid-cols-5">
          <input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Search (name / student ID / ticket)"
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <input
            value={filters.studentId}
            onChange={(e) => setFilters((f) => ({ ...f, studentId: e.target.value }))}
            placeholder="Student ID"
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <input
            value={filters.ticketNumber}
            onChange={(e) => setFilters((f) => ({ ...f, ticketNumber: e.target.value }))}
            placeholder="Ticket number"
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {appointmentsError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {appointmentsError}
          </div>
        ) : null}

        <div className="mt-4">
          {/* Mobile: cards (no horizontal scroll) */}
          <div className="grid gap-3 sm:hidden">
            {appointmentsLoading ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                Loading…
              </div>
            ) : appointments.length ? (
              appointments.map((a) => {
                const mins = remainingMinutesFor(a);
                const value = etaEdits[a._id] ?? (mins === null ? "" : String(mins));
                return (
                  <div
                    key={a._id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {a.ticketNumber}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {a.studentName}
                        </div>
                        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          ID: {a.studentId} • #{a.studentNumber}
                        </div>
                      </div>

                      <select
                        value={a.status}
                        onChange={(e) =>
                          updateAppointmentStatus(
                            a._id,
                            e.target.value as Appointment["status"]
                          )
                        }
                        className="h-9 shrink-0 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 grid gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">Service:</span>{" "}
                        {a.serviceType ?? "—"}
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">School:</span>{" "}
                        {a.school ?? "—"}
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">Issued:</span>{" "}
                        {formatDateTime(a.createdAt)}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          ETA left: {mins === null ? "—" : `${mins}m`}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(a._id, "Cancelled")}
                          disabled={a.status === "Cancelled"}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={value}
                          onChange={(e) =>
                            setEtaEdits((m) => ({ ...m, [a._id]: e.target.value }))
                          }
                          placeholder="Minutes"
                          className="h-10 w-24 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const n = Number(etaEdits[a._id]);
                            if (Number.isFinite(n)) {
                              void updateAppointmentEta(a._id, n);
                            }
                          }}
                          className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-500"
                        >
                          Set ETA
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                No tickets found.
              </div>
            )}
          </div>

          {/* Desktop/tablet: table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[900px] border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                    Ticket
                  </th>
                  <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                    Student
                  </th>
                  <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                    Student ID
                  </th>
                  <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                    Student Number
                  </th>
                  <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                    Service
                  </th>
                  <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                    School
                  </th>
                  <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                    Issued
                  </th>
                  <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                    ETA left
                  </th>
                  <th className="border-b border-zinc-200 py-3 pr-3 dark:border-zinc-800">
                    Status
                  </th>
                  <th className="border-b border-zinc-200 py-3 dark:border-zinc-800">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointmentsLoading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-6 text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : appointments.length ? (
                  appointments.map((a) => (
                    <tr key={a._id} className="text-sm">
                      <td className="border-b border-zinc-100 py-3 pr-3 font-mono text-xs dark:border-zinc-900">
                        {a.ticketNumber}
                      </td>
                      <td className="border-b border-zinc-100 py-3 pr-3 font-medium text-zinc-950 dark:border-zinc-900 dark:text-zinc-50">
                        {a.studentName}
                      </td>
                      <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                        {a.studentId}
                      </td>
                      <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                        {a.studentNumber}
                      </td>
                      <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                        {a.serviceType ?? "—"}
                      </td>
                      <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                        {a.school ?? "—"}
                      </td>
                      <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                        {formatDateTime(a.createdAt)}
                      </td>
                      <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                        {(() => {
                          const mins = remainingMinutesFor(a);
                          const value =
                            etaEdits[a._id] ?? (mins === null ? "" : String(mins));
                          return (
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                {mins === null ? "—" : `${mins}m`}
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={value}
                                onChange={(e) =>
                                  setEtaEdits((m) => ({
                                    ...m,
                                    [a._id]: e.target.value,
                                  }))
                                }
                                className="h-9 w-20 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const n = Number(etaEdits[a._id]);
                                  if (Number.isFinite(n)) {
                                    void updateAppointmentEta(a._id, n);
                                  }
                                }}
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-500"
                              >
                                Set
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="border-b border-zinc-100 py-3 pr-3 dark:border-zinc-900">
                        <select
                          value={a.status}
                          onChange={(e) =>
                            updateAppointmentStatus(
                              a._id,
                              e.target.value as Appointment["status"]
                            )
                          }
                          className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-zinc-100 py-3 dark:border-zinc-900">
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(a._id, "Cancelled")}
                          disabled={a.status === "Cancelled"}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-6 text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      No tickets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
