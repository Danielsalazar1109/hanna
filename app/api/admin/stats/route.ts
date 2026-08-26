import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel } from "@/lib/models/Appointment";
import { requireAdminOr401 } from "@/lib/admin";

export const runtime = "nodejs";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET() {
  const auth = await requireAdminOr401();
  if (auth) return auth;

  await connectMongo();

  const { start, end } = todayRange();

  const [
    totalAppointments,
    todaysAppointments,
    scheduledAppointments,
    completedAppointments,
    cancelledAppointments,
  ] = await Promise.all([
    AppointmentModel.countDocuments({}),
    AppointmentModel.countDocuments({ createdAt: { $gte: start, $lt: end } }),
    AppointmentModel.countDocuments({ status: "Scheduled" }),
    AppointmentModel.countDocuments({ status: "Completed" }),
    AppointmentModel.countDocuments({ status: "Cancelled" }),
  ]);

  return NextResponse.json({
    totalAppointments,
    todaysAppointments,
    scheduledAppointments,
    completedAppointments,
    cancelledAppointments,
  });
}
