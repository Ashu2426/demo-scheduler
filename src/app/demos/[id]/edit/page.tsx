import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canEditDemo, requireSession } from "@/lib/auth";
import { utcToIstInput } from "@/lib/time";
import { Shell, PageHeader } from "@/components/Shell";
import { DemoForm } from "@/components/DemoForm";
import { updateDemo } from "@/app/actions/demos";

export default async function EditDemoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const demo = await db.demo.findUnique({ where: { id } });
  if (!demo) notFound();
  if (!canEditDemo(session, demo.ownerId)) redirect(`/demos/${id}`);

  const [offices, products] = await Promise.all([
    db.office.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const boundUpdate = updateDemo.bind(null, id);

  return (
    <Shell session={session} active="/demos">
      <PageHeader title="Edit Demo" subtitle="Attendees are re-notified when details change." />
      <div className="max-w-2xl">
        <DemoForm
          action={boundUpdate}
          offices={offices}
          products={products}
          defaults={{
            clientName: demo.clientName,
            productId: demo.productId,
            officeId: demo.officeId,
            start: utcToIstInput(demo.startTime),
            end: utcToIstInput(demo.endTime),
            bufferMinutes: demo.bufferMinutes,
            notes: demo.notes ?? undefined,
          }}
          submitLabel="Save Changes"
          cancelHref={`/demos/${id}`}
        />
      </div>
    </Shell>
  );
}
