"use client";

import { useActionState } from "react";
import { createIssue, type IssueFormState } from "@/app/actions/issues";

export function IssueForm({
  demoId,
  users,
}: {
  demoId: string;
  users: { id: string; name: string; officeName: string }[];
}) {
  const [state, formAction, pending] = useActionState(createIssue, {} as IssueFormState);

  return (
    <form action={formAction} className="card p-5">
      <h3 className="mb-1 text-sm font-semibold">Log an issue</h3>
      <p className="mb-4 text-xs text-ink-700">
        Only the person you assign is notified — this does not go to the whole org.
      </p>

      {state.error && (
        <div className="mb-4 rounded-md border border-brand-orange bg-brand-orange-tint px-3 py-2 text-sm text-brand-orange">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="mb-4 rounded-md border border-brand-green bg-brand-green-tint px-3 py-2 text-sm text-[#4b6116]">
          {state.success}
        </div>
      )}

      <input type="hidden" name="demoId" value={demoId} />

      <div className="mb-3">
        <label className="label" htmlFor="title">
          What&apos;s broken?
        </label>
        <input
          id="title"
          name="title"
          required
          className="input"
          placeholder="Login fails on demo sandbox"
        />
      </div>

      <div className="mb-3">
        <label className="label" htmlFor="description">
          Details (optional)
        </label>
        <textarea id="description" name="description" rows={2} className="input" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="severity">
            Severity
          </label>
          <select id="severity" name="severity" defaultValue="MEDIUM" className="input">
            <option value="BLOCKS_DEMO">Blocks Demo</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="assigneeId">
            Assign to
          </label>
          <select id="assigneeId" name="assigneeId" required defaultValue="" className="input">
            <option value="" disabled>
              Select…
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.officeName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Logging…" : "Log Issue & Notify"}
      </button>
    </form>
  );
}
