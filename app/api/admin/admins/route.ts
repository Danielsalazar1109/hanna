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

function toDto(doc: {
  _id: unknown;
  username: string;
  schoolId?: unknown;
  isSuperAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AdminDto {
  return {
    id: String(doc._id),
    username: doc.username,
    schoolId: doc.schoolId ? String(doc.schoolId) : "",
    isSuperAdmin: Boolean(doc.isSuperAdmin),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
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
