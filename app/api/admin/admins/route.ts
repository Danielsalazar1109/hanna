import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireSuperAdminOr403 } from "@/lib/admin";
import { connectMongo } from "@/lib/mongodb";
import { AdminModel } from "@/lib/models/Admin";

export const runtime = "nodejs";

type AdminDto = {
  id: string;
  username: string;
  schoolId: string;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
};

function toIsoDate(input: unknown): string | null {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return input.toISOString();
  }

  if (typeof input === "string") {
    const d = new Date(input);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

function toDto(doc: {
  _id: unknown;
  username: string;
  schoolId?: unknown;
  isSuperAdmin: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}): AdminDto {
  const id = doc._id as { getTimestamp?: () => Date } | null;
  const fromObjectId = typeof id?.getTimestamp === "function" ? id.getTimestamp() : null;

  const createdAt = toIsoDate(doc.createdAt) ?? (fromObjectId ? fromObjectId.toISOString() : new Date(0).toISOString());
  const updatedAt = toIsoDate(doc.updatedAt) ?? createdAt;

  return {
    id: String(doc._id),
    username: doc.username,
    schoolId: doc.schoolId ? String(doc.schoolId) : "",
    isSuperAdmin: Boolean(doc.isSuperAdmin),
    createdAt,
    updatedAt,
  };
}

export async function GET() {
  const auth = await requireSuperAdminOr403();
  if (auth instanceof NextResponse) return auth;

  await connectMongo();

  const items = await AdminModel.find({}).sort({ username: 1 }).lean();

  return NextResponse.json({
    items: items.map((a) =>
      toDto({
        _id: a._id,
        username: a.username,
        schoolId: a.schoolId,
        isSuperAdmin: Boolean(a.isSuperAdmin),
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })
    ),
  });
}

export async function POST(req: Request) {
  const auth = await requireSuperAdminOr403();
  if (auth instanceof NextResponse) return auth;

  await connectMongo();

  const body = (await req.json().catch(() => null)) as
    | {
        username?: unknown;
        password?: unknown;
        schoolId?: unknown;
        isSuperAdmin?: unknown;
      }
    | null;

  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId.trim() : "";

  if (body?.isSuperAdmin === true) {
    return NextResponse.json(
      { error: "Creating super admins is disabled." },
      { status: 400 }
    );
  }

  if (!username || !password) {
    return NextResponse.json(
      { error: "username and password are required." },
      { status: 400 }
    );
  }

  if (!schoolId) {
    return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const created = await AdminModel.create({
      username,
      passwordHash,
      schoolId,
      isSuperAdmin: false,
    });

    return NextResponse.json({ item: toDto(created.toObject()) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
