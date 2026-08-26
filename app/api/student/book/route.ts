import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel } from "@/lib/models/Appointment";
import { CounterModel } from "@/lib/models/Counter";

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
    | { studentName?: unknown; studentId?: unknown }
    | null;

  const studentName =
    typeof body?.studentName === "string" ? body.studentName.trim() : "";
  const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";

  if (!studentName || !studentId) {
    return NextResponse.json(
      { error: "Full name and student ID are required." },
      { status: 400 }
    );
  }

  const { ticketSeq, ticketNumber } = await nextTicket();

  const appointment = await AppointmentModel.create({
    ticketSeq,
    ticketNumber,
    studentName,
    studentId,
    status: "Scheduled",
  });

  return NextResponse.json({
    appointment: {
      id: String(appointment._id),
      ticketSeq: appointment.ticketSeq,
      ticketNumber: appointment.ticketNumber,
      studentName: appointment.studentName,
      studentId: appointment.studentId,
      status: appointment.status,
      createdAt: appointment.createdAt,
    },
  });
}
