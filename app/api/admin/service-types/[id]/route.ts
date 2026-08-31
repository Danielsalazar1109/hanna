import { NextResponse } from "next/server";
import { requireSuperAdminOr403 } from "@/lib/admin";
import { connectMongo } from "@/lib/mongodb";
import { ServiceTypeModel } from "@/lib/models/ServiceType";

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
    | { name?: unknown; enabled?: unknown; sortOrder?: unknown }
    | null;

  const update: { name?: string; enabled?: boolean; sortOrder?: number } = {};

  if (typeof body?.name === "string") update.name = body.name.trim();
  if (typeof body?.enabled === "boolean") update.enabled = body.enabled;
  if (Number.isFinite(Number(body?.sortOrder))) update.sortOrder = Number(body?.sortOrder);

  if (update.name !== undefined && !update.name) {
    return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
  }

  try {
    const updated = await ServiceTypeModel.findByIdAndUpdate(id, update, {
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

  await ServiceTypeModel.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
