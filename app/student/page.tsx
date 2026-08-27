"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AppointmentDto = {
  id: string;
  ticketSeq: number;
  ticketNumber: string;
  studentName: string;
  studentId: string;
  studentNumber: string;
  serviceType: string;
  status: string;
  createdAt: string;
};

type CheckResponse = { appointment: AppointmentDto | null };

type BookingResponse = {
  existing: boolean;
  appointment: AppointmentDto;
};

type ServiceTypeItem = { id: string; name: string; sortOrder: number };

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Step = "lookup" | "details" | "confirmed";

export default function StudentQueueTicketPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("lookup");

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [serviceType, setServiceType] = useState("");

  const [serviceTypes, setServiceTypes] = useState<ServiceTypeItem[]>([]);
  const [serviceTypesError, setServiceTypesError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<AppointmentDto | null>(null);
  const [isExisting, setIsExisting] = useState(false);

  const issuedAt = useMemo(() => {
    if (!confirmation) return "";
    return formatDateTime(confirmation.createdAt);
  }, [confirmation]);

  const ticketHtml = useMemo(() => {
    if (!confirmation) return "";

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Queue Ticket</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 32px; }
  .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; max-width: 640px; }
  h1 { margin: 0 0 12px; font-size: 22px; }
  .row { margin: 6px 0; }
  .label { color: #6b7280; display: inline-block; width: 160px; }
  .value { font-weight: 700; }
</style>
</head>
<body>
  <div class="card">
    <h1>${isExisting ? "Appointment Found" : "Ticket Confirmed"}</h1>
    <div class="row"><span class="label">Name:</span> <span class="value">${confirmation.studentName}</span></div>
    <div class="row"><span class="label">Student ID:</span> <span class="value">${confirmation.studentId}</span></div>
    <div class="row"><span class="label">Phone:</span> <span class="value">${confirmation.studentNumber}</span></div>
    <div class="row"><span class="label">Service:</span> <span class="value">${confirmation.serviceType}</span></div>
    <div class="row"><span class="label">Issued at:</span> <span class="value">${issuedAt}</span></div>
    <div class="row"><span class="label">Ticket Number:</span> <span class="value">${confirmation.ticketNumber}</span></div>
    <div class="row"><span class="label">Status:</span> <span class="value">${confirmation.status}</span></div>
  </div>
</body>
</html>`;
  }, [confirmation, isExisting, issuedAt]);

  async function loadServiceTypes() {
    setServiceTypesError(null);
    try {
      const res = await fetch("/api/student/service-types");
      const data = (await res.json().catch(() => null)) as
        | { items: ServiceTypeItem[] }
        | { error: string }
        | null;

      if (!res.ok || !data || "error" in data) {
        throw new Error(
          data && "error" in data ? data.error : "Failed to load service types."
        );
      }

      const items = Array.isArray(data.items) ? data.items : [];
      setServiceTypes(items);
      if (!serviceType && items[0]) {
        setServiceType(items[0].name);
      }
    } catch (e) {
      setServiceTypesError(String(e));
    }
  }

  useEffect(() => {
    // Load once on mount (defer so we don't setState synchronously inside the effect body).
    queueMicrotask(() => {
      void loadServiceTypes();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once
  }, []);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setSubmitError(null);

    try {
      const sid = studentId.trim();
      const res = await fetch(`/api/student/check?studentId=${encodeURIComponent(sid)}`);
      const data = (await res.json().catch(() => null)) as
        | CheckResponse
        | { error: string }
        | null;

      if (!res.ok || !data || "error" in data) {
        throw new Error(data && "error" in data ? data.error : "Request failed.");
      }

      if (data.appointment) {
        setIsExisting(true);
        setConfirmation(data.appointment);
        setStep("confirmed");
        return;
      }

      setStep("details");
    } catch (err) {
      setSubmitError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function book(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/student/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentName, studentId, studentNumber, serviceType }),
      });

      const data = (await res.json().catch(() => null)) as
        | BookingResponse
        | { error: string }
        | null;

      if (!res.ok || !data || "error" in data) {
        throw new Error(data && "error" in data ? data.error : "Request failed.");
      }

      setIsExisting(data.existing);
      setConfirmation(data.appointment);
      setStep("confirmed");
    } catch (err) {
      setSubmitError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "confirmed" && confirmation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {isExisting ? "Appointment already scheduled" : "Ticket Confirmed"}
            </h1>
            {isExisting ? (
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                You already have a scheduled appointment. You can’t create another ticket.
              </p>
            ) : null}

            <dl className="mt-6 grid gap-3">
              <div className="flex items-start justify-between gap-6">
                <dt className="text-sm text-zinc-600 dark:text-zinc-400">Name</dt>
                <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {confirmation.studentName}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-6">
                <dt className="text-sm text-zinc-600 dark:text-zinc-400">Student ID</dt>
                <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {confirmation.studentId}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-6">
                <dt className="text-sm text-zinc-600 dark:text-zinc-400">Phone</dt>
                <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {confirmation.studentNumber}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-6">
                <dt className="text-sm text-zinc-600 dark:text-zinc-400">Service</dt>
                <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {confirmation.serviceType}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-6">
                <dt className="text-sm text-zinc-600 dark:text-zinc-400">Issued at</dt>
                <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {issuedAt}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-6">
                <dt className="text-sm text-zinc-600 dark:text-zinc-400">Ticket number</dt>
                <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {confirmation.ticketNumber}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-6">
                <dt className="text-sm text-zinc-600 dark:text-zinc-400">Status</dt>
                <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {confirmation.status}
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadHtml(`ticket-${confirmation.ticketNumber}.html`, ticketHtml)
                }
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Download
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmation(null);
                  setIsExisting(false);
                  setSubmitError(null);
                  setStudentName("");
                  setStudentNumber("");
                  setServiceType("");
                  setStep("lookup");
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Check another ID
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Back to home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {step === "lookup" ? "Check your appointment" : "Create a new ticket"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {step === "lookup"
              ? "Enter your Student ID to see if you already have a scheduled appointment."
              : "No appointment found. Enter your details to generate a ticket number."}
          </p>

          {submitError ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {submitError}
            </div>
          ) : null}

          {step === "lookup" ? (
            <form className="mt-6 grid gap-5" onSubmit={lookup}>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Student ID
                </label>
                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  required
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  {submitting ? "Checking…" : "Continue"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            <form className="mt-6 grid gap-5" onSubmit={book}>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-50">
                Student ID: <span className="font-semibold">{studentId.trim()}</span>
                <button
                  type="button"
                  onClick={() => setStep("lookup")}
                  className="ml-3 text-sm font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                >
                  Edit
                </button>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Full name
                </label>
                <input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Phone number
                </label>
                <input
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Service type
                </label>

                {serviceTypesError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {serviceTypesError}
                  </div>
                ) : null}

                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  required
                  disabled={!serviceTypes.length}
                >
                  {serviceTypes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  {submitting ? "Generating…" : "Generate ticket"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
