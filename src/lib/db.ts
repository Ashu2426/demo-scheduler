import { PrismaClient } from "@prisma/client";
import { ensureDatabaseUrl } from "@/lib/database-url";

// Must run before the client is constructed.
const databaseUrl = ensureDatabaseUrl();

// Reuse the client across hot reloads in dev and across warm serverless
// invocations in production, so we don't exhaust the connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  // Pass the URL explicitly rather than relying on Prisma reading the
  // environment itself — that way whichever variable Vercel populated is used,
  // not just DATABASE_URL.
  new PrismaClient(databaseUrl ? { datasourceUrl: databaseUrl } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
