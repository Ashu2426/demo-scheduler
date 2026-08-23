import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { daysUntil, formatRange } from "@/lib/time";
import { Shell, PageHeader } from "@/components/Shell";
import { IssueStatusBadge, SeverityBadge } from "@/components/Badges";
import { updateIssueStatus } from "@/app/actions/issues";

export default async function IssuesPage() {
  const session = await requireSession();

  const issues = await db.issue.findMany({
    where: { assigneeId: session.userId },
    include: { demo: { include: { product: true, office: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const open = issues.filter((i) => i.status !== "RESOLVED");

  return (
    <Shell session={session} active="/issues">
      <PageHeader
        title="My Issues"
        subtitle={`${open.length} open item${open.length === 1 ? "" : "s"} assigned to you.`}
      />

      {issues.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          Nothing assigned to you right now.
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => {
            const days = daysUntil(issue.demo.startTime);
            const isUrgent = issue.severity === "BLOCKS_DEMO" && issue.status !== "RESOLVED";

            return (
              <div
                key={issue.id}
                className={`card p-4 ${isUrgent ? "border-l-4 border-l-brand-orange" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{issue.title}</span>
                  <SeverityBadge severity={issue.severity} />
                  <IssueStatusBadge status={issue.status} />
                </div>

                {issue.description && (
                  <p className="mt-1.5 text-sm text-ink-700">{issue.description}</p>
                )}

                <p className="mt-1.5 text-xs text-ink-500">
                  <Link href={`/demos/${issue.demoId}`} className="text-brand-orange hover:underline">
                    {issue.demo.product.name}
                  </Link>{" "}
                  · {issue.demo.office.name} · {formatRange(issue.demo.startTime, issue.demo.endTime)}
                  {issue.status !== "RESOLVED" && days >= 0 && (
                    <span className={days <= 1 ? "ml-1 font-semibold text-brand-orange" : "ml-1"}>
                      · demo {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
                    </span>
                  )}
                </p>

                {issue.status !== "RESOLVED" && (
                  <div className="mt-3 flex gap-2">
                    {issue.status === "OPEN" && (
                      <form action={updateIssueStatus}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <input type="hidden" name="status" value="IN_PROGRESS" />
                        <button className="btn-secondary px-3 py-1 text-xs">Start work</button>
                      </form>
                    )}
                    <form action={updateIssueStatus}>
                      <input type="hidden" name="issueId" value={issue.id} />
                      <input type="hidden" name="status" value="RESOLVED" />
                      <button className="btn-admin px-3 py-1 text-xs">Mark resolved</button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
