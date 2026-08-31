"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type AppointmentDto = {
  id: string;
  ticketSeq: number;
  ticketNumber: string;
  studentName: string;
  studentId: string;
  studentNumber: string;
  school: string;
  serviceType: string;
  status: string;
  createdAt: string;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
};

type CheckResponse = { appointment: AppointmentDto | null };

type BookingResponse = {
  existing: boolean;
  appointment: AppointmentDto;
};

type ServiceTypeItem = { id: string; name: string; sortOrder: number };
type SchoolItem = { id: string; name: string; sortOrder: number };

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

function formatHms(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}


type Step = "studentId" | "namePhone" | "school" | "service" | "confirmed";

export default function StudentQueueTicketPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("studentId");

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");

  const [serviceType, setServiceType] = useState("");
  const [school, setSchool] = useState("");

  const [serviceTypes, setServiceTypes] = useState<ServiceTypeItem[]>([]);
  const [serviceTypesError, setServiceTypesError] = useState<string | null>(null);

  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<AppointmentDto | null>(null);
  const [isExisting, setIsExisting] = useState(false);

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const issuedAt = useMemo(() => {
    if (!confirmation) return "";
    return formatDateTime(confirmation.createdAt);
  }, [confirmation]);

  useEffect(() => {
    if (step !== "confirmed" || !confirmation?.estimatedWaitMinutes) return;

    const totalSeconds = Math.max(0, Math.round(confirmation.estimatedWaitMinutes * 60));
    const deadlineMs = Date.now() + totalSeconds * 1000;

    const tick = () => {
      const secs = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemainingSeconds(secs);
    };

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [step, confirmation?.id, confirmation?.estimatedWaitMinutes]);

  const titleByStep: Record<Step, string> = {
    studentId: "Enter your Student ID",
    namePhone: "Enter your information",
    school: "Select School",
    service: "Select Service Type",
    confirmed: "Ticket Confirmed",
  };

  const subtitleByStep: Record<Step, string> = {
    studentId: "Please provide your Student ID.",
    namePhone: "Please provide your name and phone number.",
    school: "Select your school from the following list.",
    service: "Select the service type you need.",
    confirmed: "",
  };

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
    <h1>${isExisting ? "Appointment Found" : "Your queue number has been succesfully generated"}</h1>
    <div class="row"><span class="label">Name:</span> <span class="value">${confirmation.studentName}</span></div>
    <div class="row"><span class="label">Student ID:</span> <span class="value">${confirmation.studentId}</span></div>
    <div class="row"><span class="label">Phone:</span> <span class="value">${confirmation.studentNumber}</span></div>
    <div class="row"><span class="label">School:</span> <span class="value">${confirmation.school}</span></div>
    <div class="row"><span class="label">Service:</span> <span class="value">${confirmation.serviceType}</span></div>
    <div class="row"><span class="label">Issued at:</span> <span class="value">${issuedAt}</span></div>
    <div class="row"><span class="label">Ticket Number:</span> <span class="value">${confirmation.ticketNumber}</span></div>
    <div class="row"><span class="label">Status:</span> <span class="value">${confirmation.status}</span></div>
    ${
      typeof confirmation.queuePosition === "number" &&
      typeof confirmation.estimatedWaitMinutes === "number"
        ? `<div class="row"><span class="label">Queue position:</span> <span class="value">${confirmation.queuePosition}</span></div>
           <div class="row"><span class="label">Estimated wait:</span> <span class="value">${confirmation.estimatedWaitMinutes} minutes</span></div>`
        : ""
    }
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

  async function loadSchools() {
    setSchoolsError(null);

    try {
      const res = await fetch("/api/student/schools");
      const data = (await res.json().catch(() => null)) as
        | { items: SchoolItem[] }
        | { error: string }
        | null;

      if (!res.ok || !data || "error" in data) {
        throw new Error(data && "error" in data ? data.error : "Failed to load schools.");
      }

      const items = Array.isArray(data.items) ? data.items : [];
      setSchools(items);
      if (!school && items[0]) {
        setSchool(items[0].name);
      }
    } catch (e) {
      setSchoolsError(String(e));
    }
  }

  useEffect(() => {
    // Load once on mount (defer so we don't setState synchronously inside the effect body).
    queueMicrotask(() => {
      void loadServiceTypes();
      void loadSchools();
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
        setRemainingSeconds(
          typeof data.appointment.estimatedWaitMinutes === "number"
            ? Math.round(data.appointment.estimatedWaitMinutes * 60)
            : null
        );
        setStep("confirmed");
        return;
      }

      setStep("namePhone");
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
        body: JSON.stringify({
          studentName,
          studentId,
          studentNumber,
          school,
          serviceType,
        }),
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
      setRemainingSeconds(
        typeof data.appointment.estimatedWaitMinutes === "number"
          ? Math.round(data.appointment.estimatedWaitMinutes * 60)
          : null
      );
      setStep("confirmed");
    } catch (err) {
      setSubmitError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "confirmed" && confirmation) {
    const estimatedWaitMinutes =
      typeof confirmation.estimatedWaitMinutes === "number"
        ? confirmation.estimatedWaitMinutes
        : null;
    const queuePosition =
      typeof confirmation.queuePosition === "number" ? confirmation.queuePosition : null;

    const countdownText =
      estimatedWaitMinutes !== null
        ? formatHms(remainingSeconds ?? Math.round(estimatedWaitMinutes * 60))
        : "";

    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl border border-zinc-200 bg-blue-100 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <Image src="/confirmation.png" alt="Logo" width={100} height={100} className="mx-auto mb-6" />
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 text-center">
              {isExisting ? "Appointment already scheduled" : "Your queue number has been successfully generated"}
            </h1>
            {isExisting ? (
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                You already have a scheduled appointment. You can’t create another ticket.
              </p>
            ) : null}

            <dl className="mt-6 grid gap-3">
              <div className="flex w-full justify-center bg-blue-300 p-2">
  <div className="flex w-full flex-col items-center justify-center">
    <p className="text-center text-md text-blue-700 dark:text-blue-400">
      YOUR QUEUE NUMBER
    </p>

    <p className="text-center text-6xl font-semibold text-zinc-950 dark:text-zinc-50">
      {confirmation.ticketNumber}
    </p>
  </div>
</div>
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
                <dt className="text-sm text-zinc-600 dark:text-zinc-400">School</dt>
                <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {confirmation.school}
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

              {queuePosition !== null && estimatedWaitMinutes !== null ? (
                <>
                  <div className="flex items-start justify-between gap-6">
                    <dt className="text-sm text-zinc-600 dark:text-zinc-400">Queue position</dt>
                    <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {queuePosition}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-6">
                    <dt className="text-sm text-zinc-600 dark:text-zinc-400">Estimated wait</dt>
                    <dd className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {estimatedWaitMinutes} minutes
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-6">
                    <dt className="text-sm text-zinc-600 dark:text-zinc-400">Countdown</dt>
                    <dd className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                      {countdownText}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                View Queue Status
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 text-center">
            {titleByStep[step]}
          </h1>
          <p className="mt-2 text-md leading-6 text-zinc-600 dark:text-zinc-400 text-center mx-16">
            {subtitleByStep[step]}
          </p>

          {submitError ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {submitError}
            </div>
          ) : null}

          {step === "studentId" ? (
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
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  {submitting ? "Checking…" : "Continue"}
                </button>
                <Image src="/form.png" className="mx-auto" alt="Logo" width={400} height={50} />
              </div>
            </form>
          ) : null}

          {step === "namePhone" ? (
            <form
              className="mt-6 grid gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                setStep("school");
              }}
            >
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-50">
                Student ID: <span className="font-semibold">{studentId.trim()}</span>
                <button
                  type="button"
                  onClick={() => setStep("studentId")}
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

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-row gap-3 mx-auto">
                <button
                  type="button"
                  onClick={() => setStep("studentId")}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-10 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-800 px-10 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  Continue
                </button>
                </div>
              </div>
            </form>
          ) : null}

          {step === "school" ? (
            <form
              className="mt-6 grid gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                setStep("service");
              }}
            >
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-50">
                Student ID: <span className="font-semibold">{studentId.trim()}</span>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  School
                </label>

                {schoolsError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {schoolsError}
                  </div>
                ) : null}

                {!schools.length ? (
                  <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                    Loading schools…
                  </div>
                ) : (
                  <div role="radiogroup" aria-label="School" className="grid gap-2">
                    {schools.map((s) => {
                      const selected = school === s.name;

                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setSchool(s.name)}
                          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm shadow-sm transition ${
                            selected
                              ? "border-blue-700 bg-blue-50 text-zinc-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-zinc-50"
                              : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                        >
                          <span className={selected ? "font-semibold" : ""}>{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                 <div className="flex flex-row gap-3 mx-auto">
                <button
                  type="button"
                  onClick={() => setStep("namePhone")}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-10 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!school || submitting || !schools.length}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-800 px-10 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  Get Queue Number
                </button>
                </div>
              </div>
            </form>
          ) : null}

          {step === "service" ? (
            <form className="mt-6 grid gap-5" onSubmit={book}>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-50">
                Student ID: <span className="font-semibold">{studentId.trim()}</span>
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

                {!serviceTypes.length ? (
                  <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                    Loading service types…
                  </div>
                ) : (
                  <div role="radiogroup" aria-label="Service type" className="grid gap-2">
                    {serviceTypes.map((t) => {
                      const selected = serviceType === t.name;

                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setServiceType(t.name)}
                          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm shadow-sm transition ${
                            selected
                              ? "border-blue-700 bg-blue-50 text-zinc-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-zinc-50"
                              : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                        >
                          <span className={selected ? "font-semibold" : ""}>{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                 <div className="flex flex-row gap-3 mx-auto">
                <button
                  type="button"
                  onClick={() => setStep("school")}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-10 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!serviceType || submitting || !serviceTypes.length}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-800 px-10 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  {submitting ? "Submitting…" : "Continue"}
                </button>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
