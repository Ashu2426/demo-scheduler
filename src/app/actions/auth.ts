"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { SESSION_COOKIE, encodeSession, sessionCookieOptions } from "@/lib/session";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await db.user.findUnique({ where: { email }, include: { office: true } });

  // Same message either way, so the form can't be used to discover valid emails.
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }

  const token = await encodeSession({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    officeId: user.officeId,
    officeName: user.office.name,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);

  redirect("/calendar");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
