"use client";

import { useActionState } from "react";
import { createOffice, createProduct, createUser, type AdminFormState } from "@/app/actions/admin";

function Feedback({ state }: { state: AdminFormState }) {
  if (state.error)
    return (
      <p className="mt-2 text-xs text-brand-orange">{state.error}</p>
    );
  if (state.success)
    return <p className="mt-2 text-xs text-[#4b6116]">{state.success}</p>;
  return null;
}

export function AddOfficeForm() {
  const [state, action, pending] = useActionState(createOffice, {} as AdminFormState);
  return (
    <form action={action}>
      <div className="flex gap-2">
        <input name="name" required className="input" placeholder="e.g. Bengaluru" />
        <button disabled={pending} className="btn-admin whitespace-nowrap">
          {pending ? "Adding…" : "+ Add Office"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function AddProductForm() {
  const [state, action, pending] = useActionState(createProduct, {} as AdminFormState);
  return (
    <form action={action}>
      <div className="flex gap-2">
        <input
          name="name"
          required
          className="input"
          placeholder="e.g. Mozart Suite — Billing"
        />
        <button disabled={pending} className="btn-admin whitespace-nowrap">
          {pending ? "Adding…" : "+ Add Product"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function AddUserForm({ offices }: { offices: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createUser, {} as AdminFormState);
  return (
    <form action={action}>
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="name" required className="input" placeholder="Full name" />
        <input name="email" type="email" required className="input" placeholder="name@monocept.com" />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="input"
          placeholder="Temporary password (min 8 chars)"
        />
        <div className="grid grid-cols-2 gap-2">
          <select name="role" defaultValue="VIEWER" className="input">
            <option value="VIEWER">Viewer</option>
            <option value="OWNER">Demo Owner</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select name="officeId" required defaultValue="" className="input">
            <option value="" disabled>
              Office…
            </option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button disabled={pending} className="btn-admin mt-2">
        {pending ? "Adding…" : "+ Add User"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
