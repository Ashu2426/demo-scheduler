import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RoleBadge } from "@/components/Badges";
import { logout } from "@/app/actions/auth";
import type { SessionPayload } from "@/lib/session";

const NAV = [
  { href: "/calendar", label: "Calendar" },
  { href: "/demos", label: "Demos" },
  { href: "/issues", label: "My Issues" },
];

export function Shell({
  session,
  active,
  children,
}: {
  session: SessionPayload;
  active: string;
  children: React.ReactNode;
}) {
  const nav = session.role === "ADMIN" ? [...NAV, { href: "/admin", label: "Admin" }] : NAV;

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-300 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/calendar" className="flex items-center gap-2">
            <Logo className="h-6 w-auto" />
          </Link>
          <nav className="ml-4 flex gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-head transition-colors ${
                  active === item.href
                    ? "bg-brand-orange-tint font-semibold text-brand-orange"
                    : "text-ink-700 hover:bg-ink-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-head font-semibold leading-tight">{session.name}</div>
              <div className="text-xs text-ink-500">{session.officeName}</div>
            </div>
            <RoleBadge role={session.role} />
            <form action={logout}>
              <button type="submit" className="btn-ghost text-xs">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-700">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
