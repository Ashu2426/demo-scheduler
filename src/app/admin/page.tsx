import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isAdmin, requireSession } from "@/lib/auth";
import { Shell, PageHeader } from "@/components/Shell";
import { AddOfficeForm, AddProductForm, AddUserForm } from "@/components/AdminForms";
import { setUserRole } from "@/app/actions/admin";

export default async function AdminPage() {
  const session = await requireSession();
  if (!isAdmin(session)) redirect("/calendar");

  const [offices, products, users] = await Promise.all([
    db.office.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true, demos: true } } },
    }),
    db.product.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { demos: true } } },
    }),
    db.user.findMany({ orderBy: { name: "asc" }, include: { office: true } }),
  ]);

  return (
    <Shell session={session} active="/admin">
      <PageHeader
        title="Admin"
        subtitle="Add branch offices, products, and people. Changes take effect immediately — no redeploy."
      />

      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Office Locations</h2>
          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left font-head text-xs uppercase text-ink-700">
                <th className="py-2">Office</th>
                <th className="py-2">Users</th>
                <th className="py-2">Demos</th>
              </tr>
            </thead>
            <tbody>
              {offices.map((o) => (
                <tr key={o.id} className="border-b border-ink-100 last:border-0">
                  <td className="py-2">{o.name}</td>
                  <td className="py-2 text-ink-700">{o._count.users}</td>
                  <td className="py-2 text-ink-700">{o._count.demos}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <AddOfficeForm />
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Products / Environments</h2>
          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left font-head text-xs uppercase text-ink-700">
                <th className="py-2">Product</th>
                <th className="py-2">Demos booked</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-ink-100 last:border-0">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-ink-700">{p._count.demos}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <AddProductForm />
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Users &amp; Roles</h2>
          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left font-head text-xs uppercase text-ink-700">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Office</th>
                <th className="py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-ink-100 last:border-0">
                  <td className="py-2">{u.name}</td>
                  <td className="py-2 text-ink-700">{u.email}</td>
                  <td className="py-2 text-ink-700">{u.office.name}</td>
                  <td className="py-2">
                    <form action={setUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        disabled={u.id === session.userId}
                        className="input w-auto py-1 text-xs"
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="OWNER">Demo Owner</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      {u.id !== session.userId && (
                        <button className="btn-ghost px-2 py-1 text-xs">Save</button>
                      )}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AddUserForm offices={offices} />
        </section>
      </div>
    </Shell>
  );
}
