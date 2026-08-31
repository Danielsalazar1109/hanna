import { NextResponse } from "next/server";
import { getAdminFromRequestCookies } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminFromRequestCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    adminId: admin.sub,
    username: admin.username,
    schoolId: admin.schoolId,
    isSuperAdmin: admin.isSuperAdmin,
  });
}
