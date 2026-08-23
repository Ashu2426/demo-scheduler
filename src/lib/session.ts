import { SignJWT, jwtVerify } from "jose";

// `jose` is used (rather than a Node-only JWT library) because middleware runs
// on the Edge runtime, where Node crypto isn't available.

export type SessionPayload = {
  userId: string;
  name: string;
  email: string;
  role: "ADMIN" | "OWNER" | "VIEWER";
  officeId: string;
  officeName: string;
};

export const SESSION_COOKIE = "dsms_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Add it to your environment variables.");
  }
  return new TextEncoder().encode(secret);
}

export async function encodeSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function decodeSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
