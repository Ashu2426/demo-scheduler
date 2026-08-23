/**
 * Vercel injects a different variable name depending on which Postgres product
 * you attach (Neon sets DATABASE_URL, older Vercel Postgres sets POSTGRES_URL /
 * POSTGRES_PRISMA_URL). Accept whichever is present so the deployment works
 * regardless of the choice.
 *
 * POSTGRES_PRISMA_URL is preferred over POSTGRES_URL when both exist — it
 * carries the connection-pooling parameters Prisma wants in serverless.
 */
export function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    undefined
  );
}

/** Prisma reads DATABASE_URL at client construction, so normalise it first. */
export function ensureDatabaseUrl(): string | undefined {
  const url = resolveDatabaseUrl();
  if (url && !process.env.DATABASE_URL) process.env.DATABASE_URL = url;
  return url;
}
