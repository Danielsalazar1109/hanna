import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel } from "@/lib/models/Appointment";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await connectMongo();

  const body = (await req.json().catch(() => null)) as
    | {
        appointmentId?: unknown;
      }
    | null;

  const appointmentId =
    typeof body?.appointmentId === "string" ? body.appointmentId.trim() : "";

  if (!appointmentId) {
    return NextResponse.json(
      { error: "appointmentId is required." },
      { status: 400 }
    );
  }

  // Only allow deleting the active appointment.
  const res = await AppointmentModel.deleteOne({
    _id: appointmentId,
    status: "Scheduled",
  });

  return NextResponse.json({ deleted: res.deletedCount === 1 });
}
