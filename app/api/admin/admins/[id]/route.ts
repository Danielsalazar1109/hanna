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

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireSuperAdminOr403();
  if (auth instanceof NextResponse) return auth;

  await connectMongo();

  const { id } = await params;

  const existing = await AdminModel.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (existing.isSuperAdmin) {
    return NextResponse.json(
      { error: "Super admin cannot be modified via this endpoint." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | {
        username?: unknown;
        password?: unknown;
        schoolId?: unknown;
        isSuperAdmin?: unknown;
      }
    | null;

  const update: {
    username?: string;
    passwordHash?: string;
    schoolId?: string | null;
  } = {};

  if (typeof body?.username === "string") update.username = body.username.trim();
  if (typeof body?.schoolId === "string") update.schoolId = body.schoolId.trim();
  if (typeof body?.password === "string" && body.password) {
    update.passwordHash = await bcrypt.hash(body.password, 12);
  }

  if (body?.isSuperAdmin !== undefined) {
    return NextResponse.json(
      { error: "Changing super admin role is disabled." },
      { status: 400 }
    );
  }

  if (update.username !== undefined && !update.username) {
    return NextResponse.json({ error: "username cannot be empty." }, { status: 400 });
  }

  // Admins managed here are always school admins.
  if (update.schoolId !== undefined && !update.schoolId) {
    return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
  }

  const normalizedUpdate: Record<string, unknown> = {};
  if (update.username !== undefined) normalizedUpdate.username = update.username;
  if (update.passwordHash !== undefined) normalizedUpdate.passwordHash = update.passwordHash;
  if (update.schoolId !== undefined) {
    normalizedUpdate.schoolId = update.schoolId ? update.schoolId : undefined;
  }

  try {
    const updated = await AdminModel.findByIdAndUpdate(id, normalizedUpdate, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({
      item: toDto({
        _id: updated._id,
        username: updated.username,
        schoolId: updated.schoolId,
        isSuperAdmin: Boolean(updated.isSuperAdmin),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireSuperAdminOr403();
  if (auth instanceof NextResponse) return auth;

  await connectMongo();

  const { id } = await params;

  const existing = await AdminModel.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (existing.isSuperAdmin) {
    return NextResponse.json(
      { error: "Cannot delete super admin." },
      { status: 400 }
    );
  }

  await AdminModel.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
