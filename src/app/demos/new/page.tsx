import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManageDemos, requireSession } from "@/lib/auth";
import { Shell, PageHeader } from "@/components/Shell";
import { DemoForm } from "@/components/DemoForm";
import { createDemo } from "@/app/actions/demos";

export default async function NewDemoPage() {
  const session = await requireSession();
  if (!canManageDemos(session)) redirect("/calendar");

  const [offices, products] = await Promise.all([
    db.office.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <Shell session={session} active="/demos">
      <PageHeader
        title="Schedule a Demo"
        subtitle="Saving publishes a freeze window that every office can see."
      />
      <div className="max-w-2xl">
        <DemoForm
          action={createDemo}
          offices={offices}
          products={products}
          defaults={{ officeId: session.officeId, bufferMinutes: 30 }}
          submitLabel="Save & Publish"
          cancelHref="/demos"
        />
      </div>
    </Shell>
  );
}
