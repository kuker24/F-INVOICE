import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { getCustomer } from "@/server/services/customers";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { CustomerForm } from "@/components/forms/customer-form";
import { AppError } from "@/server/errors";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const { id } = await params;
  let customer;
  try {
    customer = await getCustomer(session.profile, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div>
        <p className="text-xs text-mid-gray">
          <Link
            href="/customers"
            className="underline-offset-2 hover:underline"
          >
            Pelanggan
          </Link>
          <span className="mx-1.5" aria-hidden>
            /
          </span>
          <span className="text-ink">{customer.code}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {customer.name}
          </h1>
          <Badge tone={statusTone(customer.status)}>{customer.status}</Badge>
        </div>
      </div>
      <Card>
        <CardTitle className="mb-4">Edit data</CardTitle>
        <CustomerForm mode="edit" id={customer.id} initial={customer} />
      </Card>
    </div>
  );
}
