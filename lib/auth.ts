import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

export const ADMIN_TOKEN_COOKIE = "admin_token";

type AdminJwtPayload = {
  sub: string;
  role: "admin";
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

export async function signAdminToken(username: string): Promise<string> {
  return new SignJWT({ role: "admin" } satisfies Omit<AdminJwtPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminJwtPayload> {
  const { payload } = await jwtVerify(token, secretKey());

  const sub = payload.sub;
  const role = payload.role;

  if (typeof sub !== "string") throw new Error("Invalid token subject");
  if (role !== "admin") throw new Error("Invalid token role");

  return { sub, role };
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
