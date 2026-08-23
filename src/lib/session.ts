import { SignJWT, jwtVerify } from "jose";
import { resolveDatabaseUrl } from "@/lib/database-url";

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

let cachedSecret: Uint8Array | null = null;

/**
 * Prefers an explicit AUTH_SECRET. If none is set, derives a stable signing key
 * from DATABASE_URL — which is secret, high-entropy, and already present on
 * Vercel — so a fresh deployment works without configuring anything by hand.
 *
 * Setting AUTH_SECRET explicitly is still better: it lets you rotate session
 * keys without touching the database, and keeps the two concerns separate.
 */
async function getSecret(): Promise<Uint8Array> {
  if (cachedSecret) return cachedSecret;

  const explicit = process.env.AUTH_SECRET;
  if (explicit) {
    cachedSecret = new TextEncoder().encode(explicit);
    return cachedSecret;
  }

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Cannot sign sessions: set AUTH_SECRET (or DATABASE_URL) in your environment.",
    );
  }

  // Domain-separated so this key can never collide with any other use of the URL.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`dsms-session-key|v1|${databaseUrl}`),
  );
  cachedSecret = new Uint8Array(digest);
  return cachedSecret;
}

export async function encodeSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(await getSecret());
}

export async function decodeSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await getSecret());
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
