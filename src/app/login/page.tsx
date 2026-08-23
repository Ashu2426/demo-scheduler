"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo className="mx-auto h-8 w-auto" />
          <h1 className="mt-4 text-lg font-semibold">Demo Schedule &amp; Management</h1>
          <p className="mt-1 text-sm text-ink-700">Sign in to view and book demo slots.</p>
        </div>

        <form action={formAction} className="card p-6">
          {state.error && (
            <div className="mb-4 rounded-md border border-brand-orange bg-brand-orange-tint px-3 py-2 text-sm text-brand-orange">
              {state.error}
            </div>
          )}

          <div className="mb-4">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="you@monocept.com"
            />
          </div>

          <div className="mb-5">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
            />
          </div>

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-500">
          Seeded demo login: <code>rahul@monocept.com</code> / <code>Passw0rd!</code>
        </p>
      </div>
    </div>
  );
}
