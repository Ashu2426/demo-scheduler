import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DATABASE_URL_CANDIDATES, resolveDatabaseUrlSource } from "@/lib/database-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment diagnostic. Reports whether a database is reachable and which
 * environment variable supplied the connection string.
 *
 * Reports only presence and length — never the values themselves, since a
 * connection string contains credentials.
 */
export async function GET() {
  const variables = Object.fromEntries(
    DATABASE_URL_CANDIDATES.map((name) => {
      const raw = process.env[name];
      if (raw === undefined) return [name, "not set"];
      if (raw.trim() === "") return [name, "SET BUT EMPTY — delete this variable"];
      return [name, `set (${raw.trim().length} chars)`];
    }),
  );

  const usingVariable = resolveDatabaseUrlSource();

  if (!usingVariable) {
    return NextResponse.json(
      {
        ok: false,
        problem: "No database connection string found.",
        fix: "In Vercel → Storage, attach a Postgres database to this project, then redeploy. If a blank DATABASE_URL exists under Settings → Environment Variables, delete it.",
        variables,
      },
      { status: 503 },
    );
  }

  try {
    const [users, offices, products, demos] = await Promise.all([
      db.user.count(),
      db.office.count(),
      db.product.count(),
      db.demo.count(),
    ]);

    return NextResponse.json({
      ok: true,
      usingVariable,
      variables,
      tables: { users, offices, products, demos },
      seeded: users > 0,
      note:
        users > 0
          ? "Database is connected and seeded. You can sign in."
          : "Connected, but no users exist — the seed has not run. Redeploy to seed.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        usingVariable,
        variables,
        problem: "Connected to the app but the database query failed.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
