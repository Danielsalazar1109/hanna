import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel } from "@/lib/models/Appointment";

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

  const { queuePosition, estimatedWaitMinutes } = await computeEstimate({
    schoolId: appt.schoolId,
    serviceType: appt.serviceType,
    createdAt: appt.createdAt,
  });

  const etaUntil =
    (appt as { etaUntil?: unknown }).etaUntil instanceof Date
      ? ((appt as { etaUntil: Date }).etaUntil as Date)
      : etaUntilFrom({ createdAt: appt.createdAt, estimatedWaitMinutes });

  return NextResponse.json({
    appointment: {
      id: String(appt._id),
      ticketSeq: appt.ticketSeq,
      ticketNumber: appt.ticketNumber,
      studentName: appt.studentName,
      studentId: appt.studentId,
      studentNumber: appt.studentNumber,
      school: appt.school,
      serviceType: appt.serviceType,
      status: appt.status,
      createdAt: appt.createdAt,
      queuePosition,
      estimatedWaitMinutes,
      etaUntil,
    },
  });
}
