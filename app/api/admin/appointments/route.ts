import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel, APPOINTMENT_STATUSES } from "@/lib/models/Appointment";
import { requireAdminOr401 } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminOr401();
  if (auth) return auth;

  await connectMongo();

  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") ?? "").trim();
  const studentId = (searchParams.get("studentId") ?? "").trim();
  const ticketNumber = (searchParams.get("ticketNumber") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const date = (searchParams.get("date") ?? "").trim(); // YYYY-MM-DD (filter by createdAt)

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limitRaw = Number(searchParams.get("limit") ?? 50);
  const limit = Math.min(200, Math.max(1, limitRaw));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (studentId) filter.studentId = studentId;
  if (ticketNumber) filter.ticketNumber = ticketNumber;
  if (status && (APPOINTMENT_STATUSES as readonly string[]).includes(status)) {
    filter.status = status;
  }

  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.createdAt = { $gte: start, $lt: end };
  }

  if (q) {
    filter.$or = [
      { studentName: { $regex: q, $options: "i" } },
      { studentId: q },
      { ticketNumber: q },
    ];
  }

  const [items, total] = await Promise.all([
    AppointmentModel.find(filter)
      .sort({ ticketSeq: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AppointmentModel.countDocuments(filter),
  ]);

  return NextResponse.json({ items, total, page, limit });
}
