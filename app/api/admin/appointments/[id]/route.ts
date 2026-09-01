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
  if (auth instanceof NextResponse) return auth;
  const { admin } = auth;

  await connectMongo();

  const { id } = await params;
  const appointment = await AppointmentModel.findById(id).lean();

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!admin.isSuperAdmin && String(appointment.schoolId ?? "") !== admin.schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ appointment });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdminOr401();
  if (auth instanceof NextResponse) return auth;
  const { admin } = auth;

  await connectMongo();

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { status?: unknown; etaMinutesRemaining?: unknown }
    | null;

  const status = typeof body?.status === "string" ? body.status : "";
  const etaMinutesRemainingRaw = body?.etaMinutesRemaining;
  const etaMinutesRemaining =
    typeof etaMinutesRemainingRaw === "number" ? etaMinutesRemainingRaw : null;

  const appointment = await AppointmentModel.findById(id);
  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!admin.isSuperAdmin && String(appointment.schoolId ?? "") !== admin.schoolId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let didUpdate = false;

  if (status) {
    if (!(APPOINTMENT_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    appointment.status = status as AppointmentStatus;
    didUpdate = true;
  }

  if (etaMinutesRemaining !== null) {
    if (!Number.isFinite(etaMinutesRemaining) || etaMinutesRemaining < 0) {
      return NextResponse.json(
        { error: "etaMinutesRemaining must be a non-negative number." },
        { status: 400 }
      );
    }

    // Cap at 24h to avoid accidental huge values.
    const capped = Math.min(24 * 60, Math.round(etaMinutesRemaining));
    appointment.etaUntil = new Date(Date.now() + capped * 60 * 1000);
    didUpdate = true;
  }

  if (!didUpdate) {
    return NextResponse.json(
      { error: "No supported fields provided." },
      { status: 400 }
    );
  }

  await appointment.save();

  return NextResponse.json({ appointment });
}
