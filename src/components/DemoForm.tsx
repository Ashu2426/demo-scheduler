"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { DemoFormState } from "@/app/actions/demos";

type Option = { id: string; name: string };

export function DemoForm({
  action,
  offices,
  products,
  defaults,
  submitLabel,
  cancelHref,
}: {
  action: (prev: DemoFormState, formData: FormData) => Promise<DemoFormState>;
  offices: Option[];
  products: Option[];
  defaults?: {
    clientName?: string;
    productId?: string;
    officeId?: string;
    start?: string;
    end?: string;
    bufferMinutes?: number;
    notes?: string;
  };
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as DemoFormState);

  return (
    <form action={formAction} className="card p-6">
      {state.error && (
        <div className="mb-5 rounded-md border border-brand-orange bg-brand-orange-tint px-3 py-2.5 text-sm text-brand-orange">
          <b>Cannot save:</b> {state.error}
        </div>
      )}

      <div className="mb-4">
        <label className="label" htmlFor="clientName">
          Client / Account
        </label>
        <input
          id="clientName"
          name="clientName"
          required
          defaultValue={defaults?.clientName}
          className="input"
          placeholder="Acme Insurance Co."
        />
        <p className="mt-1 text-xs text-ink-500">
          Visible only to you, anyone you assign an issue to, and admins.
        </p>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="productId">
            Product / Environment
          </label>
          <select
            id="productId"
            name="productId"
            required
            defaultValue={defaults?.productId ?? ""}
            className="input"
          >
            <option value="" disabled>
              Select…
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="officeId">
            Office
          </label>
          <select
            id="officeId"
            name="officeId"
            required
            defaultValue={defaults?.officeId ?? ""}
            className="input"
          >
            <option value="" disabled>
              Select…
            </option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="start">
            Start (IST)
          </label>
          <input
            id="start"
            name="start"
            type="datetime-local"
            required
            defaultValue={defaults?.start}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="end">
            End (IST)
          </label>
          <input
            id="end"
            name="end"
            type="datetime-local"
            required
            defaultValue={defaults?.end}
            className="input"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="label" htmlFor="bufferMinutes">
          Freeze buffer (minutes either side)
        </label>
        <select
          id="bufferMinutes"
          name="bufferMinutes"
          defaultValue={String(defaults?.bufferMinutes ?? 30)}
          className="input sm:max-w-xs"
        >
          <option value="0">No buffer</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
        </select>
        <p className="mt-1 text-xs text-ink-500">
          The environment is treated as frozen for this long before and after the demo.
        </p>
      </div>

      <div className="mb-5">
        <label className="label" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaults?.notes}
          className="input"
          placeholder="Anything the team should know before this demo."
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
