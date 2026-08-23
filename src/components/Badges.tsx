import type { DemoStatus, IssueStatus, Severity } from "@prisma/client";

export function DemoStatusBadge({ status, atRisk }: { status: DemoStatus; atRisk?: boolean }) {
  if (status === "CANCELLED")
    return <span className="pill border border-dashed border-ink-500 text-ink-500">Cancelled</span>;
  if (status === "COMPLETED")
    return <span className="pill bg-ink-100 text-ink-700">Completed</span>;
  if (atRisk)
    return (
      <span className="pill border-2 border-brand-orange bg-white text-brand-orange">
        At-Risk
      </span>
    );
  return <span className="pill bg-brand-orange text-white">Frozen</span>;
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  if (status === "RESOLVED")
    return <span className="pill bg-brand-green text-[#2c3a12]">Resolved</span>;
  if (status === "IN_PROGRESS")
    return <span className="pill border border-ink-500 text-ink-700">In Progress</span>;
  return <span className="pill border border-brand-orange text-brand-orange">Open</span>;
}

const SEVERITY_LABELS: Record<Severity, string> = {
  BLOCKS_DEMO: "Blocks Demo",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const isBlocking = severity === "BLOCKS_DEMO";
  return (
    <span
      className={
        isBlocking
          ? "pill bg-brand-orange-tint text-brand-orange border border-brand-orange"
          : "pill bg-ink-100 text-ink-700"
      }
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: "bg-brand-green-tint text-[#4b6116] border border-brand-green",
    OWNER: "bg-brand-orange-tint text-brand-orange border border-brand-orange",
    VIEWER: "bg-ink-100 text-ink-700",
  };
  const labels: Record<string, string> = {
    ADMIN: "Admin",
    OWNER: "Demo Owner",
    VIEWER: "Viewer",
  };
  return <span className={`pill ${styles[role] ?? styles.VIEWER}`}>{labels[role] ?? role}</span>;
}
