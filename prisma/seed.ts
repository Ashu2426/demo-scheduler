import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Everyone in the seed shares this password — change it after first login.
const DEFAULT_PASSWORD = "Passw0rd!";

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const officeNames = ["Mumbai", "Gurgaon", "Hyderabad"];
  const offices: Record<string, string> = {};
  for (const name of officeNames) {
    const office = await prisma.office.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    offices[name] = office.id;
  }

  const productNames = [
    "Mozart Suite — Claims Module",
    "Mozart Suite — Onboarding",
    "Mozart Suite — Analytics",
  ];
  for (const name of productNames) {
    await prisma.product.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const users = [
    { name: "Admin User", email: "admin@monocept.com", role: Role.ADMIN, office: "Hyderabad" },
    { name: "Rahul Sharma", email: "rahul@monocept.com", role: Role.OWNER, office: "Hyderabad" },
    { name: "Priya Iyer", email: "priya@monocept.com", role: Role.OWNER, office: "Mumbai" },
    { name: "Arjun Bose", email: "arjun@monocept.com", role: Role.VIEWER, office: "Gurgaon" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
        officeId: offices[u.office],
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Users created with password: ${DEFAULT_PASSWORD}`);
  users.forEach((u) => console.log(`  ${u.email.padEnd(26)} ${u.role}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
