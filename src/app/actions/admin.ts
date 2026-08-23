"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdmin, requireSession } from "@/lib/auth";

export type AdminFormState = { error?: string; success?: string };

async function requireAdmin() {
  const session = await requireSession();
  if (!isAdmin(session)) throw new Error("Admin access required.");
  return session;
}

function revalidateAll() {
  revalidatePath("/admin");
  revalidatePath("/calendar");
  revalidatePath("/demos");
}

/** New branch offices are added here — no code change or redeploy needed. */
export async function createOffice(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter an office name." };

  const existing = await db.office.findUnique({ where: { name } });
  if (existing) return { error: `${name} already exists.` };

  await db.office.create({ data: { name } });
  revalidateAll();
  return { success: `${name} added.` };
}

export async function createProduct(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a product or environment name." };

  const existing = await db.product.findUnique({ where: { name } });
  if (existing) return { error: `${name} already exists.` };

  await db.product.create({ data: { name } });
  revalidateAll();
  return { success: `${name} added.` };
}

const userSchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["ADMIN", "OWNER", "VIEWER"]),
  officeId: z.string().min(1, "Choose an office."),
});

export async function createUser(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    officeId: formData.get("officeId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "A user with that email already exists." };

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      officeId: parsed.data.officeId,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
  });

  revalidateAll();
  return { success: `${parsed.data.name} added.` };
}

export async function setUserRole(formData: FormData) {
  const session = await requireAdmin();
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role")) as "ADMIN" | "OWNER" | "VIEWER";

  // Guard against an admin removing their own last route back in.
  if (userId === session.userId && role !== "ADMIN") return;

  await db.user.update({ where: { id: userId }, data: { role } });
  revalidateAll();
}
