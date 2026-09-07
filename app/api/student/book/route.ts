import { NextResponse } from "next/server";
import type { HydratedDocument } from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel, type AppointmentDoc } from "@/lib/models/Appointment";
import { CounterModel } from "@/lib/models/Counter";
import { ServiceTypeModel } from "@/lib/models/ServiceType";
import { SchoolModel } from "@/lib/models/School";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D+/g, "")}`;
  }
  const digits = trimmed.replace(/\D+/g, "");
  return digits.startsWith("0") ? digits.slice(1) : digits;
}

function isPlausiblePhone(raw: string): boolean {
  const normalized = normalizePhone(raw);
  const digits = normalized.startsWith("+") ? normalized.slice(1) : normalized;
  if (!/^\d{10,15}$/.test(digits)) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  return true;
}

function etaUntilFrom(args: { createdAt: Date; estimatedWaitMinutes: number }): Date {
  return new Date(args.createdAt.getTime() + args.estimatedWaitMinutes * 60 * 1000);
}

function manilaDayBounds(date: Date): { start: Date; end: Date } {
  // Manila is UTC+8 with no DST.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);

  // Convert Manila midnight -> UTC timestamp.
  const manilaOffsetMs = 8 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - manilaOffsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

async function computeEstimate(args: {
  schoolId: unknown;
  serviceType: string;
  createdAt: Date;
}): Promise<{ queuePosition: number; estimatedWaitMinutes: number }> {
  const queuePosition = await AppointmentModel.countDocuments({
    schoolId: args.schoolId,
    serviceType: args.serviceType,
    status: "Scheduled",
    createdAt: { $lte: args.createdAt },
  });

  return { queuePosition, estimatedWaitMinutes: queuePosition * 15 };
}

function serviceSlug(serviceType: string): string {
  return serviceType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function idSuffix(id: unknown, len: number): string {
  const raw = String(id ?? "").trim();
  return raw.slice(-len).toUpperCase();
}

function acronymFromName(name: string, maxLen: number): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean);

  const stop = new Set(["of", "the", "and"]);
  const meaningful = parts.filter((p) => !stop.has(p.toLowerCase()));

  const letters = meaningful.map((p) => p[0]!).join("").toUpperCase();
  if (letters.length >= 2) return letters.slice(0, maxLen);

  const compact = meaningful.join("").toUpperCase();
  return (compact || "SCH").slice(0, maxLen);
}

function schoolTag(args: { schoolId: unknown; schoolName: string }): string {
  const acro = acronymFromName(args.schoolName, 4);
  const suf = idSuffix(args.schoolId, 2) || "00";
  return `${acro}${suf}`;
}

function counterKey(args: { schoolId: unknown; serviceType: string }): string {
  const schoolIdStr = String(args.schoolId);
  const normalizedService = serviceSlug(args.serviceType);
  return `appointment:${schoolIdStr}:${normalizedService}`;
}

async function nextTicket(args: {
  schoolId: unknown;
  serviceType: string;
}): Promise<{ ticketSeq: number; ticketNumber: string }> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: counterKey(args) },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const ticketSeq = counter.seq;
  // ticketNumber is scoped per school. DB uniqueness is enforced via a compound index
  // (schoolId + ticketNumber) so the same ticketNumber can exist in different schools.
  // Business rule: tickets are scoped per school, so short codes like "C-1" are OK across schools.
  // Uniqueness will be enforced via a compound index (schoolId + ticketNumber).
  const serviceTag = acronymFromName(args.serviceType, 1);
  const ticketNumber = `${serviceTag}-${ticketSeq}`;

  return { ticketSeq, ticketNumber };
}

export async function POST(req: Request) {
  await connectMongo();

  const body = (await req.json().catch(() => null)) as
    | {
        studentName?: unknown;
        studentId?: unknown;
        studentNumber?: unknown;
        serviceType?: unknown;
        serviceTypeId?: unknown;
        school?: unknown;
        schoolId?: unknown;
      }
    | null;

  const studentName =
    typeof body?.studentName === "string" ? body.studentName.trim() : "";
  const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
  const studentNumber =
    typeof body?.studentNumber === "string" ? body.studentNumber.trim() : "";
  const serviceType = typeof body?.serviceType === "string" ? body.serviceType.trim() : "";
  const serviceTypeId = typeof body?.serviceTypeId === "string" ? body.serviceTypeId.trim() : "";
  const school = typeof body?.school === "string" ? body.school.trim() : "";
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId.trim() : "";

  if (!studentName || !studentId || !studentNumber || (!serviceType && !serviceTypeId) || (!school && !schoolId)) {
    return NextResponse.json(
      {
        error:
          "Full name, student ID, phone number, school, and service type are required.",
      },
      { status: 400 }
    );
  }

  if (!isPlausiblePhone(studentNumber)) {
    return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
  }
  const normalizedPhone = normalizePhone(studentNumber);

  const validServiceType = serviceTypeId
    ? await ServiceTypeModel.findOne({ _id: serviceTypeId, enabled: true }).lean()
    : await ServiceTypeModel.findOne({ name: serviceType, enabled: true }).lean();

  if (!validServiceType) {
    return NextResponse.json({ error: "Invalid service type." }, { status: 400 });
  }

  const validSchool = schoolId
    ? await SchoolModel.findOne({ _id: schoolId, enabled: true }).lean()
    : await SchoolModel.findOne({ name: school, enabled: true }).lean();
  if (!validSchool) {
    return NextResponse.json({ error: "Invalid school." }, { status: 400 });
  }

  const resolvedServiceTypeName = validServiceType.name;
  const resolvedSchoolName = validSchool.name;

  // Enforce per-school daily capacity (0 = unlimited).
  const dailyCapacityRaw = (validSchool as { dailyCapacity?: unknown } | null)?.dailyCapacity;
  const dailyCapacity = Number.isFinite(Number(dailyCapacityRaw))
    ? Number(dailyCapacityRaw)
    : 0;

  if (dailyCapacity > 0) {
    const { start, end } = manilaDayBounds(new Date());
    const used = await AppointmentModel.countDocuments({
      schoolId: validSchool._id,
      status: "Scheduled",
      createdAt: { $gte: start, $lt: end },
    });

    if (used >= dailyCapacity) {
      return NextResponse.json(
        { error: "Sorry, the slots are full." },
        { status: 409 }
      );
    }
  }

  // Prevent duplicate active appointments per studentId.
  const existing = await AppointmentModel.findOne({
    studentId,
    status: "Scheduled",
  })
    .sort({ createdAt: -1 })
    .lean();

  if (existing) {
    const { queuePosition, estimatedWaitMinutes } = await computeEstimate({
      schoolId: existing.schoolId,
      serviceType: existing.serviceType,
      createdAt: existing.createdAt,
    });

    const etaUntil =
      (existing as { etaUntil?: unknown }).etaUntil instanceof Date
        ? ((existing as { etaUntil: Date }).etaUntil as Date)
        : etaUntilFrom({ createdAt: existing.createdAt, estimatedWaitMinutes });

    return NextResponse.json({
      existing: true,
      appointment: {
        id: String(existing._id),
        ticketSeq: existing.ticketSeq,
        ticketNumber: existing.ticketNumber,
        studentName: existing.studentName,
        studentId: existing.studentId,
        studentNumber: existing.studentNumber,
        school: existing.school,
        serviceType: existing.serviceType,
        status: existing.status,
        createdAt: existing.createdAt,
        queuePosition,
        estimatedWaitMinutes,
        etaUntil,
      },
    });
  }

  let appointment: HydratedDocument<AppointmentDoc> | null = null;
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { ticketSeq, ticketNumber } = await nextTicket({
      schoolId: validSchool._id,
      serviceType: resolvedServiceTypeName,
    });

    try {
      const draft = new AppointmentModel({
        ticketSeq,
        ticketNumber,
        studentName,
        studentId,
        studentNumber: normalizedPhone,
        schoolId: validSchool._id,
        school: resolvedSchoolName,
        serviceType: resolvedServiceTypeName,
        status: "Scheduled",
      });
      appointment = await draft.save();
      break;
    } catch (err) {
      lastErr = err;
      const code = (err as { code?: unknown } | null)?.code;
      if (code === 11000) {
        continue;
      }
      throw err;
    }
  }

  if (!appointment) {
    throw lastErr;
  }

  const { queuePosition, estimatedWaitMinutes } = await computeEstimate({
    schoolId: appointment.schoolId,
    serviceType: appointment.serviceType,
    createdAt: appointment.createdAt,
  });

  const etaUntil = etaUntilFrom({
    createdAt: appointment.createdAt,
    estimatedWaitMinutes,
  });

  appointment.etaUntil = etaUntil;
  await appointment.save();

  return NextResponse.json({
    existing: false,
    appointment: {
      id: String(appointment._id),
      ticketSeq: appointment.ticketSeq,
      ticketNumber: appointment.ticketNumber,
      studentName: appointment.studentName,
      studentId: appointment.studentId,
      studentNumber: appointment.studentNumber,
      school: appointment.school,
      serviceType: appointment.serviceType,
      status: appointment.status,
      createdAt: appointment.createdAt,
      queuePosition,
      estimatedWaitMinutes,
      etaUntil,
    },
  });
}
