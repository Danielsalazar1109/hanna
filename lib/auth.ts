import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

export const ADMIN_TOKEN_COOKIE = "admin_token";

export type AdminJwtPayload = {
  sub: string;
  role: "admin";
  username: string;
  schoolId: string;
  isSuperAdmin: boolean;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

export async function signAdminToken(input: {
  adminId: string;
  username: string;
  schoolId: string;
  isSuperAdmin: boolean;
}): Promise<string> {
  return new SignJWT({
    role: "admin",
    username: input.username,
    schoolId: input.schoolId,
    isSuperAdmin: input.isSuperAdmin,
  } satisfies Omit<AdminJwtPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.adminId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminJwtPayload> {
  const { payload } = await jwtVerify(token, secretKey());

  const sub = payload.sub;
  const role = payload.role;
  const username = payload.username;
  const schoolId = payload.schoolId;
  const isSuperAdmin = payload.isSuperAdmin;

  if (typeof sub !== "string") throw new Error("Invalid token subject");
  if (role !== "admin") throw new Error("Invalid token role");
  if (typeof username !== "string") throw new Error("Invalid token username");
  if (typeof schoolId !== "string") throw new Error("Invalid token schoolId");
  if (typeof isSuperAdmin !== "boolean") {
    throw new Error("Invalid token isSuperAdmin");
  }

  return { sub, role, username, schoolId, isSuperAdmin };
}

export async function getAdminFromRequestCookies(): Promise<AdminJwtPayload | null> {
  const token = (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}
