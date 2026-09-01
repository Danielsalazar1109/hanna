import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel } from "@/lib/models/Appointment";
import { CounterModel } from "@/lib/models/Counter";
import { ServiceTypeModel } from "@/lib/models/ServiceType";
import { SchoolModel } from "@/lib/models/School";

export const runtime = "nodejs";

function etaUntilFrom(args: { createdAt: Date; estimatedWaitMinutes: number }): Date {
  return new Date(args.createdAt.getTime() + args.estimatedWaitMinutes * 60 * 1000);
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

function serviceInitial(serviceType: string): string {
  const trimmed = serviceType.trim();
  const first = trimmed[0] ?? "T";
  return first.toUpperCase();
}

function counterKey(args: { schoolId: unknown; serviceType: string }): string {
  const schoolIdStr = String(args.schoolId);
  const normalizedService = args.serviceType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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
  const ticketNumber = `${serviceInitial(args.serviceType)}-${ticketSeq}`;

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
      }
    | null;

  const studentName =
    typeof body?.studentName === "string" ? body.studentName.trim() : "";
  const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
  const studentNumber =
    typeof body?.studentNumber === "string" ? body.studentNumber.trim() : "";
  const serviceType =
    typeof body?.serviceType === "string" ? body.serviceType.trim() : "";
  const school = typeof (body as { school?: unknown } | null)?.school === "string"
    ? String((body as { school?: unknown }).school).trim()
    : "";

  if (!studentName || !studentId || !studentNumber || !serviceType || !school) {
    return NextResponse.json(
      {
        error:
          "Full name, student ID, phone number, school, and service type are required.",
      },
      { status: 400 }
    );
  }

  const validServiceType = await ServiceTypeModel.findOne({
    name: serviceType,
    enabled: true,
  }).lean();

  if (!validServiceType) {
    return NextResponse.json({ error: "Invalid service type." }, { status: 400 });
  }

  const validSchool = await SchoolModel.findOne({ name: school, enabled: true }).lean();
  if (!validSchool) {
    return NextResponse.json({ error: "Invalid school." }, { status: 400 });
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

  const { ticketSeq, ticketNumber } = await nextTicket({
    schoolId: validSchool._id,
    serviceType,
  });

  const appointment = await AppointmentModel.create({
    ticketSeq,
    ticketNumber,
    studentName,
    studentId,
    studentNumber,
    schoolId: validSchool._id,
    school,
    serviceType,
    status: "Scheduled",
  });

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
