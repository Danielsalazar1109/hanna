import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import {
  AppointmentModel,
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from "@/lib/models/Appointment";
import { requireAdminOr401 } from "@/lib/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAdminOr401();
  if (auth) return auth;

  await connectMongo();

  const { id } = await params;
  const appointment = await AppointmentModel.findById(id).lean();

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ appointment });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdminOr401();
  if (auth) return auth;

  await connectMongo();

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { status?: unknown }
    | null;

  const status = typeof body?.status === "string" ? body.status : "";
  if (!status || !(APPOINTMENT_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const appointment = await AppointmentModel.findById(id);
  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  appointment.status = status as AppointmentStatus;
  await appointment.save();

  return NextResponse.json({ appointment });
}
