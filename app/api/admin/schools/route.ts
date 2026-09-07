import { NextResponse } from "next/server";
import { requireSuperAdminOr403 } from "@/lib/admin";
import { connectMongo } from "@/lib/mongodb";
import { SchoolModel } from "@/lib/models/School";

export const runtime = "nodejs";

type SchoolDto = {
  id: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
  dailyCapacity: number;
  createdAt: string;
  updatedAt: string;
};

function toDto(doc: {
  _id: unknown;
  name: string;
  enabled: boolean;
  sortOrder: number;
  dailyCapacity: number;
  createdAt: Date;
  updatedAt: Date;
}): SchoolDto {
  return {
    id: String(doc._id),
    name: doc.name,
    enabled: doc.enabled,
    sortOrder: doc.sortOrder,
    dailyCapacity: Number.isFinite(Number(doc.dailyCapacity)) ? Number(doc.dailyCapacity) : 0,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireSuperAdminOr403();
  if (auth instanceof NextResponse) return auth;

  await connectMongo();

  const items = await SchoolModel.find({}).sort({ sortOrder: 1, name: 1 }).lean();
  return NextResponse.json({ items: items.map(toDto) });
}

export async function POST(req: Request) {
  const auth = await requireSuperAdminOr403();
  if (auth instanceof NextResponse) return auth;

  await connectMongo();

  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; enabled?: unknown; sortOrder?: unknown; dailyCapacity?: unknown }
    | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const enabled = typeof body?.enabled === "boolean" ? body.enabled : true;
  const sortOrder = Number.isFinite(Number(body?.sortOrder))
    ? Number(body?.sortOrder)
    : 0;

  const dailyCapacity = Number.isFinite(Number(body?.dailyCapacity))
    ? Number(body?.dailyCapacity)
    : 0;

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  if (!Number.isFinite(dailyCapacity) || dailyCapacity < 0) {
    return NextResponse.json(
      { error: "dailyCapacity must be a non-negative number." },
      { status: 400 }
    );
  }

  try {
    const created = await SchoolModel.create({
      name,
      enabled,
      sortOrder,
      dailyCapacity,
    });
    return NextResponse.json({ item: toDto(created.toObject()) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
