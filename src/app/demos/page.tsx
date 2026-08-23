import Link from "next/link";
import { db } from "@/lib/db";
import { canManageDemos, canSeeClientName, requireSession } from "@/lib/auth";
import { formatRange, formatTime, freezeWindow } from "@/lib/time";
import { Shell, PageHeader } from "@/components/Shell";
import { DemoStatusBadge } from "@/components/Badges";

export default async function DemosPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await requireSession();
  const { filter = "upcoming" } = await searchParams;

  const now = new Date();
  const where =
    filter === "past"
      ? { startTime: { lt: now } }
      : filter === "mine"
        ? { ownerId: session.userId }
        : { startTime: { gte: now }, status: { not: "CANCELLED" as const } };

  const demos = await db.demo.findMany({
    where,
    include: {
      product: true,
      office: true,
      owner: true,
      issues: { where: { status: { not: "RESOLVED" } } },
    },
    orderBy: { startTime: filter === "past" ? "desc" : "asc" },
    take: 100,
  });

  const tabs = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "mine", label: "My demos" },
  ];

  return (
    <Shell session={session} active="/demos">
      <PageHeader
        title="Demos"
        subtitle="All scheduled demos across every office, with the exact window each environment is frozen."
        action={
          canManageDemos(session) ? (
            <Link href="/demos/new" className="btn-primary">
              + New Demo
            </Link>
          ) : null
        }
      />

      <div className="mb-4 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/demos?filter=${tab.key}`}
            className={`pill border ${
              filter === tab.key
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-300 text-ink-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-900 text-left font-head text-xs uppercase tracking-wide text-white">
              <th className="px-3 py-2.5">Date &amp; Time</th>
              <th className="px-3 py-2.5">Product / Environment</th>
              <th className="px-3 py-2.5">Client</th>
              <th className="px-3 py-2.5">Office</th>
              <th className="px-3 py-2.5">Owner</th>
              <th className="px-3 py-2.5">Freeze Window</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {demos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-ink-500">
                  No demos here yet.
                </td>
              </tr>
            )}
            {demos.map((demo) => {
              const atRisk = demo.issues.some((i) => i.severity === "BLOCKS_DEMO");
              const window = freezeWindow(demo);
              const visible = canSeeClientName(session, demo);

              return (
                <tr key={demo.id} className="border-b border-ink-100 last:border-0 even:bg-[#fafafa]">
                  <td className="px-3 py-2.5">
                    <Link href={`/demos/${demo.id}`} className="text-brand-orange hover:underline">
                      {formatRange(demo.startTime, demo.endTime)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{demo.product.name}</td>
                  <td className="px-3 py-2.5">
                    {visible ? (
                      demo.clientName
                    ) : (
                      <span className="italic text-ink-500">Confidential</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{demo.office.name}</td>
                  <td className="px-3 py-2.5">{demo.owner.name}</td>
                  <td className="px-3 py-2.5 text-ink-700">
                    {demo.status === "SCHEDULED" ? (
                      <>
                        {formatTime(window.start)}–{formatTime(window.end)}
                        <span className="ml-1 text-xs text-ink-500">
                          (+{demo.bufferMinutes}m)
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <DemoStatusBadge status={demo.status} atRisk={atRisk} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
