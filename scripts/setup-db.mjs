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
const databaseUrl =
  process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
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
