import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canEditDemo, canSeeClientName, requireSession } from "@/lib/auth";
import { formatRange, formatTime, freezeWindow } from "@/lib/time";
import { Shell, PageHeader } from "@/components/Shell";
import { DemoStatusBadge, IssueStatusBadge, SeverityBadge } from "@/components/Badges";
import { IssueForm } from "@/components/IssueForm";
import { setDemoStatus } from "@/app/actions/demos";
import { updateIssueStatus } from "@/app/actions/issues";

export default async function DemoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const demo = await db.demo.findUnique({
    where: { id },
    include: {
      product: true,
      office: true,
      owner: true,
      issues: {
        include: { assignee: true, reportedBy: true },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!demo) notFound();

  const users = await db.user.findMany({
    where: { isActive: true },
    include: { office: true },
    orderBy: { name: "asc" },
  });

  const canEdit = canEditDemo(session, demo.ownerId);
  const showClient = canSeeClientName(session, demo);
  const openIssues = demo.issues.filter((i) => i.status !== "RESOLVED");
  const atRisk = openIssues.some((i) => i.severity === "BLOCKS_DEMO");
  const window = freezeWindow(demo);

  return (
    <Shell session={session} active="/demos">
      <PageHeader
        title={demo.product.name}
        subtitle={`${demo.office.name} · ${formatRange(demo.startTime, demo.endTime)}`}
        action={
          canEdit ? (
            <div className="flex gap-2">
              <Link href={`/demos/${demo.id}/edit`} className="btn-secondary">
                Edit
              </Link>
              {demo.status === "SCHEDULED" && (
                <>
                  <form action={setDemoStatus}>
                    <input type="hidden" name="demoId" value={demo.id} />
                    <input type="hidden" name="status" value="COMPLETED" />
                    <button type="submit" className="btn-secondary">
                      Mark Complete
                    </button>
                  </form>
                  <form action={setDemoStatus}>
                    <input type="hidden" name="demoId" value={demo.id} />
                    <input type="hidden" name="status" value="CANCELLED" />
                    <button type="submit" className="btn-ghost">
                      Cancel Demo
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <div className="card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <DemoStatusBadge status={demo.status} atRisk={atRisk} />
              {atRisk && (
                <span className="text-sm text-brand-orange">
                  A blocking issue is still open on this demo.
                </span>
              )}
            </div>

            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="label mb-0.5">Client</dt>
                <dd>
                  {showClient ? (
                    demo.clientName
                  ) : (
                    <span className="italic text-ink-500">Confidential — stakeholders only</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="label mb-0.5">Demo Owner</dt>
                <dd>{demo.owner.name}</dd>
              </div>
              <div>
                <dt className="label mb-0.5">Freeze window</dt>
                <dd className="text-brand-orange">
                  {formatTime(window.start)} – {formatTime(window.end)} IST
                  <span className="ml-1 text-xs text-ink-500">
                    (demo ±{demo.bufferMinutes} min)
                  </span>
                </dd>
              </div>
              <div>
                <dt className="label mb-0.5">Office</dt>
                <dd>{demo.office.name}</dd>
              </div>
            </dl>

            {demo.notes && (
              <div className="mt-4 border-t border-ink-100 pt-3">
                <dt className="label mb-0.5">Notes</dt>
                <p className="text-sm text-ink-700">{demo.notes}</p>
              </div>
            )}

            {demo.status === "SCHEDULED" && (
              <div className="mt-4 rounded-md border border-brand-orange bg-brand-orange-tint px-3 py-2.5 text-sm text-brand-orange">
                <b>{demo.product.name}</b> is reserved during the window above. Please hold any
                deployments or config changes to this environment until it closes.
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-3">
              <h2 className="text-sm font-semibold">
                Issues ({openIssues.length} open / {demo.issues.length} total)
              </h2>
            </div>

            {demo.issues.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-ink-500">
                No issues logged. Run the pre-demo check and log anything you find.
              </p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {demo.issues.map((issue) => {
                  const canUpdate =
                    session.role === "ADMIN" ||
                    session.userId === issue.assigneeId ||
                    session.userId === demo.ownerId;

                  return (
                    <li key={issue.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{issue.title}</span>
                        <SeverityBadge severity={issue.severity} />
                        <IssueStatusBadge status={issue.status} />
                      </div>
                      {issue.description && (
                        <p className="mt-1 text-sm text-ink-700">{issue.description}</p>
                      )}
                      <p className="mt-1 text-xs text-ink-500">
                        Assigned to {issue.assignee.name} · reported by {issue.reportedBy.name}
                      </p>

                      {canUpdate && issue.status !== "RESOLVED" && (
                        <div className="mt-2 flex gap-2">
                          {issue.status === "OPEN" && (
                            <form action={updateIssueStatus}>
                              <input type="hidden" name="issueId" value={issue.id} />
                              <input type="hidden" name="status" value="IN_PROGRESS" />
                              <button className="btn-secondary px-3 py-1 text-xs">
                                Start work
                              </button>
                            </form>
                          )}
                          <form action={updateIssueStatus}>
                            <input type="hidden" name="issueId" value={issue.id} />
                            <input type="hidden" name="status" value="RESOLVED" />
                            <button className="btn-admin px-3 py-1 text-xs">Mark resolved</button>
                          </form>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div>
          <IssueForm
            demoId={demo.id}
            users={users.map((u) => ({ id: u.id, name: u.name, officeName: u.office.name }))}
          />
        </div>
      </div>
    </Shell>
  );
}
