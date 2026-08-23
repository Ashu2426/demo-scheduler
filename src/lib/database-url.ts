/**
 * Vercel injects a different variable name depending on which Postgres product
 * is attached (Neon sets DATABASE_URL, older Vercel Postgres sets POSTGRES_URL /
 * POSTGRES_PRISMA_URL). Accept whichever is actually populated.
 *
 * An empty or whitespace-only value counts as absent — a variable created in the
 * dashboard but left blank would otherwise shadow a working one and produce
 * "You must provide a nonempty URL" at runtime.
 */

/** Candidate variable names, in order of preference. */
export const DATABASE_URL_CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveDatabaseUrl(): string | undefined {
  for (const name of DATABASE_URL_CANDIDATES) {
    const value = nonEmpty(process.env[name]);
    if (value) return value;
  }
  return undefined;
}

/** Which variable the connection came from — for diagnostics, never the value. */
export function resolveDatabaseUrlSource(): string | undefined {
  return DATABASE_URL_CANDIDATES.find((name) => nonEmpty(process.env[name]));
}

/** Prisma falls back to reading DATABASE_URL itself, so normalise it too. */
export function ensureDatabaseUrl(): string | undefined {
  const url = resolveDatabaseUrl();
  if (url) process.env.DATABASE_URL = url;
  return url;
}
