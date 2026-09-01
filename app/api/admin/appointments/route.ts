import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { AppointmentModel, APPOINTMENT_STATUSES } from "@/lib/models/Appointment";
import { requireAdminOr401 } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdminOr401();
  if (auth instanceof NextResponse) return auth;
  const { admin } = auth;

  await connectMongo();

  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") ?? "").trim();
  const studentId = (searchParams.get("studentId") ?? "").trim();
  const ticketNumber = (searchParams.get("ticketNumber") ?? "").trim();
  const serviceTypeParam = (searchParams.get("serviceType") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const date = (searchParams.get("date") ?? "").trim(); // YYYY-MM-DD (filter by createdAt)

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limitRaw = Number(searchParams.get("limit") ?? 50);
  const limit = Math.min(200, Math.max(1, limitRaw));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = admin.isSuperAdmin
    ? {}
    : { schoolId: admin.schoolId };

  if (studentId) filter.studentId = studentId;
  if (ticketNumber) filter.ticketNumber = ticketNumber;
  if (serviceTypeParam) filter.serviceType = serviceTypeParam;
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

  const [rawItems, total] = await Promise.all([
    AppointmentModel.find(filter)
      .sort({ ticketSeq: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AppointmentModel.countDocuments(filter),
  ]);

  const items = await Promise.all(
    rawItems.map(async (a) => {
      const status = String((a as { status?: unknown }).status ?? "");
      if (status !== "Scheduled") return a;

      const etaUntil = (a as { etaUntil?: unknown }).etaUntil;
      if (etaUntil instanceof Date) return a;

      const schoolId = (a as { schoolId?: unknown }).schoolId;
      const serviceType = String((a as { serviceType?: unknown }).serviceType ?? "");
      const createdAt = (a as { createdAt?: unknown }).createdAt;

      if (!schoolId || !serviceType || !(createdAt instanceof Date)) return a;

      const queuePosition = await AppointmentModel.countDocuments({
        schoolId,
        serviceType,
        status: "Scheduled",
        createdAt: { $lte: createdAt },
      });

      const estimatedWaitMinutes = queuePosition * 15;
      const derivedEtaUntil = new Date(createdAt.getTime() + estimatedWaitMinutes * 60 * 1000);

      return {
        ...a,
        queuePosition,
        estimatedWaitMinutes,
        etaUntil: derivedEtaUntil,
      };
    })
  );

  return NextResponse.json({ items, total, page, limit });
}
