import { PrismaClient } from "@prisma/client";

// Reuse the client across hot reloads in dev and across warm serverless
// invocations in production, so we don't exhaust the connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
