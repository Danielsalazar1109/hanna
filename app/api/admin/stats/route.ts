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
  if (auth instanceof NextResponse) return auth;
  const { admin } = auth;

  await connectMongo();

  const { start, end } = todayRange();

  const baseFilter = admin.isSuperAdmin ? {} : { schoolId: admin.schoolId };

  const [
    totalAppointments,
    todaysAppointments,
    scheduledAppointments,
    completedAppointments,
    cancelledAppointments,
  ] = await Promise.all([
    AppointmentModel.countDocuments(baseFilter),
    AppointmentModel.countDocuments({
      ...baseFilter,
      createdAt: { $gte: start, $lt: end },
    }),
    AppointmentModel.countDocuments({ ...baseFilter, status: "Scheduled" }),
    AppointmentModel.countDocuments({ ...baseFilter, status: "Completed" }),
    AppointmentModel.countDocuments({ ...baseFilter, status: "Cancelled" }),
  ]);

  return NextResponse.json({
    totalAppointments,
    todaysAppointments,
    scheduledAppointments,
    completedAppointments,
    cancelledAppointments,
  });
}
