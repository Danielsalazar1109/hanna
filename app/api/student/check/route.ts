import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel } from "@/lib/models/Appointment";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await connectMongo();

  const { searchParams } = new URL(req.url);
  const studentId = (searchParams.get("studentId") ?? "").trim();

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }

  // "Active" appointment definition: status = Scheduled.
  const appt = await AppointmentModel.findOne({ studentId, status: "Scheduled" })
    .sort({ createdAt: -1 })
    .lean();

  if (!appt) {
    return NextResponse.json({ appointment: null });
  }

  return NextResponse.json({
    appointment: {
      id: String(appt._id),
      ticketSeq: appt.ticketSeq,
      ticketNumber: appt.ticketNumber,
      studentName: appt.studentName,
      studentId: appt.studentId,
      studentNumber: appt.studentNumber,
      serviceType: appt.serviceType,
      status: appt.status,
      createdAt: appt.createdAt,
    },
  });
}
