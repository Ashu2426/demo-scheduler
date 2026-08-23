import { execSync } from "node:child_process";

/**
 * Runs during `npm run build`, before Next.js compiles.
 *
 * Creates the database tables and inserts the starter data, so a fresh Vercel
 * deployment is usable immediately with nothing to run by hand. Both steps are
 * safe to repeat: `migrate deploy` skips migrations already applied, and the
 * seed uses upserts.
 *
 * If DATABASE_URL isn't set yet (the very first build, before a database has
 * been attached) this exits quietly rather than failing the deployment.
 */

// Vercel names this differently depending on which Postgres product is attached.
// A blank value counts as absent — Prisma rejects an empty connection string.
const CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
];

const source = CANDIDATES.find((name) => process.env[name]?.trim());
const databaseUrl = source ? process.env[source].trim() : undefined;

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
  console.log(`[setup-db] Using connection string from ${source}.`);
}

if (!databaseUrl) {
  console.warn(
    "\n[setup-db] DATABASE_URL is not set — skipping migrations and seed.\n" +
      "[setup-db] The build will finish, but the app cannot work until you add a\n" +
      "[setup-db] database and redeploy. See README.md.\n",
  );
  process.exit(0);
}

function run(command, label) {
  console.log(`\n[setup-db] ${label}…`);
  execSync(command, { stdio: "inherit" });
}

try {
  run("prisma migrate deploy", "Applying database migrations");
  run("tsx prisma/seed.ts", "Seeding starter data");
  console.log("\n[setup-db] Database ready.\n");
} catch {
  console.error(
    "\n[setup-db] Database setup failed.\n" +
      "[setup-db] Check that DATABASE_URL points at a reachable Postgres database.\n",
  );
  process.exit(1);
}
