import { NextResponse } from "next/server";
import { getAdminFromRequestCookies, type AdminJwtPayload } from "@/lib/auth";

export async function requireAdminOr401(): Promise<
  { admin: AdminJwtPayload } | NextResponse
> {
  const admin = await getAdminFromRequestCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { admin };
}

export async function requireSuperAdminOr403(): Promise<
  { admin: AdminJwtPayload } | NextResponse
> {
  const auth = await requireAdminOr401();
  if (auth instanceof NextResponse) return auth;

  if (!auth.admin.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return auth;
}
