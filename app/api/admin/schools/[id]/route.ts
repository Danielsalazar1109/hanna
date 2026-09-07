import { NextResponse } from "next/server";
import { requireSuperAdminOr403 } from "@/lib/admin";
import { connectMongo } from "@/lib/mongodb";
import { SchoolModel } from "@/lib/models/School";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminOr403();
  if (auth instanceof NextResponse) return auth;

  await connectMongo();

  const { id } = await ctx.params;

  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; enabled?: unknown; sortOrder?: unknown; dailyCapacity?: unknown }
    | null;

  const update: {
    name?: string;
    enabled?: boolean;
    sortOrder?: number;
    dailyCapacity?: number;
  } = {};

  if (typeof body?.name === "string") update.name = body.name.trim();
  if (typeof body?.enabled === "boolean") update.enabled = body.enabled;
  if (Number.isFinite(Number(body?.sortOrder))) update.sortOrder = Number(body?.sortOrder);
  if (Number.isFinite(Number(body?.dailyCapacity))) {
    update.dailyCapacity = Number(body?.dailyCapacity);
  }

  if (update.name !== undefined && !update.name) {
    return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
  }

  if (update.dailyCapacity !== undefined) {
    if (!Number.isFinite(update.dailyCapacity) || update.dailyCapacity < 0) {
      return NextResponse.json(
        { error: "dailyCapacity must be a non-negative number." },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await SchoolModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdminOr403();
  if (auth instanceof NextResponse) return auth;

  await connectMongo();

  const { id } = await ctx.params;
  await SchoolModel.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
