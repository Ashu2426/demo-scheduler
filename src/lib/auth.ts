import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, decodeSession, type SessionPayload } from "@/lib/session";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

/** Use in every authenticated page/action. Redirects to /login if signed out. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Demo Owners and Admins may create and edit demo schedules. */
export function canManageDemos(session: SessionPayload): boolean {
  return session.role === "OWNER" || session.role === "ADMIN";
}

/**
 * A demo may only be edited by the person who brought the client, or an Admin.
 * This is enforced server-side, not just hidden in the UI.
 */
export function canEditDemo(session: SessionPayload, demoOwnerId: string): boolean {
  return session.role === "ADMIN" || session.userId === demoOwnerId;
}

export function isAdmin(session: SessionPayload): boolean {
  return session.role === "ADMIN";
}

/**
 * Client names are confidential. Only the demo's owner, users assigned an issue
 * on it, and Admins see them; everyone else sees the masked freeze window.
 */
export function canSeeClientName(
  session: SessionPayload,
  demo: { ownerId: string; issues?: { assigneeId: string }[] },
): boolean {
  if (session.role === "ADMIN") return true;
  if (session.userId === demo.ownerId) return true;
  return (demo.issues ?? []).some((i) => i.assigneeId === session.userId);
}
