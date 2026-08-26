import { NextResponse } from "next/server";
import { getAdminFromRequestCookies } from "@/lib/auth";

export async function requireAdminOr401(): Promise<void | NextResponse> {
  const admin = await getAdminFromRequestCookies();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
