import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ADMIN_TOKEN_COOKIE, signAdminToken } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { AdminModel } from "@/lib/models/Admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { username?: unknown; password?: unknown }
    | null;

  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  await connectMongo();

  const admin = await AdminModel.findOne({ username }).lean();
  if (!admin) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const isSuperAdmin = Boolean((admin as { isSuperAdmin?: unknown }).isSuperAdmin);

  const schoolId = admin.schoolId ? String(admin.schoolId) : "";
  if (!isSuperAdmin && !schoolId) {
    return NextResponse.json(
      { error: "Admin is not assigned to a school." },
      { status: 401 }
    );
  }

  const token = await signAdminToken({
    adminId: String(admin._id),
    username: admin.username,
    schoolId,
    isSuperAdmin,
  });
  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: ADMIN_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return res;
}
