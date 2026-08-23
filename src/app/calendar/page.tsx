import Link from "next/link";
import { db } from "@/lib/db";
import { canManageDemos, canSeeClientName, requireSession } from "@/lib/auth";
import { formatTime, freezeWindow, istParts } from "@/lib/time";
import { Shell, PageHeader } from "@/components/Shell";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ office?: string; month?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const now = new Date();
  const nowParts = istParts(now);
  const [year, month] = params.month
    ? params.month.split("-").map(Number).slice(0, 2).map((n, i) => (i === 1 ? n - 1 : n))
    : [nowParts.year, nowParts.month];

  // Month boundaries in IST, expressed as UTC instants.
  const monthStart = new Date(Date.UTC(year, month, 1, -5, -30));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1, -5, -30));

  const offices = await db.office.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const demos = await db.demo.findMany({
    where: {
      startTime: { gte: monthStart, lt: monthEnd },
      status: { not: "CANCELLED" },
      ...(params.office ? { officeId: params.office } : {}),
    },
    include: {
      product: true,
      office: true,
      owner: true,
      issues: { where: { status: { not: "RESOLVED" } } },
    },
    orderBy: { startTime: "asc" },
  });

  // Group demos by IST day-of-month.
  const byDay = new Map<number, typeof demos>();
  for (const demo of demos) {
    const day = istParts(demo.startTime).day;
    byDay.set(day, [...(byDay.get(day) ?? []), demo]);
  }

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Monday-first offset for the 1st of the month.
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const prevMonth = `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, "0")}`;
  const nextMonth = `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, "0")}`;
  const officeQuery = params.office ? `&office=${params.office}` : "";

  return (
    <Shell session={session} active="/calendar">
      <PageHeader
        title="Shared Demo Calendar"
        subtitle="Every scheduled demo blocks its environment. Do not deploy or change a product during its freeze window."
        action={
          canManageDemos(session) ? (
            <Link href="/demos/new" className="btn-primary">
              + New Demo
            </Link>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/calendar?month=${year}-${String(month + 1).padStart(2, "0")}`}
          className={`pill border ${!params.office ? "border-ink-900 bg-ink-900 text-white" : "border-ink-300 text-ink-700"}`}
        >
          All Offices
        </Link>
        {offices.map((office) => (
          <Link
            key={office.id}
            href={`/calendar?month=${year}-${String(month + 1).padStart(2, "0")}&office=${office.id}`}
            className={`pill border ${
              params.office === office.id
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-300 text-ink-700"
            }`}
          >
            {office.name}
          </Link>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <Link href={`/calendar?month=${prevMonth}${officeQuery}`} className="btn-secondary px-3 py-1 text-xs">
            ←
          </Link>
          <span className="font-head text-sm font-semibold">{monthLabel}</span>
          <Link href={`/calendar?month=${nextMonth}${officeQuery}`} className="btn-secondary px-3 py-1 text-xs">
            →
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center font-head text-xs font-semibold text-ink-700">
              {d}
            </div>
          ))}

          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayDemos = byDay.get(day) ?? [];
            const isToday =
              nowParts.year === year && nowParts.month === month && nowParts.day === day;

            return (
              <div
                key={day}
                className={`min-h-[92px] rounded-md border p-1.5 ${
                  isToday ? "border-brand-orange bg-brand-orange-tint" : "border-ink-100"
                }`}
              >
                <div className="mb-1 font-head text-xs font-semibold text-ink-700">{day}</div>
                <div className="space-y-1">
                  {dayDemos.map((demo) => {
                    const atRisk = demo.issues.some((i) => i.severity === "BLOCKS_DEMO");
                    const window = freezeWindow(demo);
                    const label = canSeeClientName(session, demo)
                      ? demo.clientName
                      : "Confidential";

                    return (
                      <Link
                        key={demo.id}
                        href={`/demos/${demo.id}`}
                        title={`${demo.product.name} · ${demo.office.name} · freeze ${formatTime(window.start)}–${formatTime(window.end)}`}
                        className={`block truncate rounded px-1.5 py-1 text-[11px] leading-tight ${
                          atRisk
                            ? "border border-brand-orange bg-white font-semibold text-brand-orange"
                            : "bg-brand-orange text-white"
                        }`}
                      >
                        {atRisk ? "⚠ " : ""}
                        {formatTime(demo.startTime)} {demo.product.name.replace("Mozart Suite — ", "")}
                        <span className="block truncate opacity-80">
                          {label} · {demo.office.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-500">
        Solid orange = environment frozen · Outlined = at-risk (a blocking issue is open) ·
        Client names are visible only to the demo owner, assigned engineers, and admins.
      </p>
    </Shell>
  );
}
