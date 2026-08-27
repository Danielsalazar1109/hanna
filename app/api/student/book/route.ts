import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel } from "@/lib/models/Appointment";
import { CounterModel } from "@/lib/models/Counter";
import { ServiceTypeModel } from "@/lib/models/ServiceType";

export const runtime = "nodejs";

async function nextTicket(): Promise<{ ticketSeq: number; ticketNumber: string }> {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: "appointment" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const ticketSeq = counter.seq;
  const ticketNumber = `A-${ticketSeq}`;

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

  if (!studentName || !studentId || !studentNumber || !serviceType) {
    return NextResponse.json(
      {
        error:
          "Full name, student ID, phone number, and service type are required.",
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

  // Prevent duplicate active appointments per studentId.
  const existing = await AppointmentModel.findOne({
    studentId,
    status: "Scheduled",
  })
    .sort({ createdAt: -1 })
    .lean();

  if (existing) {
    return NextResponse.json({
      existing: true,
      appointment: {
        id: String(existing._id),
        ticketSeq: existing.ticketSeq,
        ticketNumber: existing.ticketNumber,
        studentName: existing.studentName,
        studentId: existing.studentId,
        studentNumber: existing.studentNumber,
        serviceType: existing.serviceType,
        status: existing.status,
        createdAt: existing.createdAt,
      },
    });
  }

  const { ticketSeq, ticketNumber } = await nextTicket();

  const appointment = await AppointmentModel.create({
    ticketSeq,
    ticketNumber,
    studentName,
    studentId,
    studentNumber,
    serviceType,
    status: "Scheduled",
  });

  return NextResponse.json({
    existing: false,
    appointment: {
      id: String(appointment._id),
      ticketSeq: appointment.ticketSeq,
      ticketNumber: appointment.ticketNumber,
      studentName: appointment.studentName,
      studentId: appointment.studentId,
      studentNumber: appointment.studentNumber,
      serviceType: appointment.serviceType,
      status: appointment.status,
      createdAt: appointment.createdAt,
    },
  });
}
