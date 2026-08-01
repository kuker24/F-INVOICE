import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listCustomers } from "@/server/services/customers";
import { listProducts } from "@/server/services/products";
import { Card, CardTitle } from "@/components/ui/card";
import { SubscriptionForm } from "@/components/forms/subscription-form";

export default async function NewSubPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const [customers, products] = await Promise.all([
    listCustomers(session.profile),
    listProducts(session.profile),
  ]);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <h1 className="text-xl font-semibold">Langganan baru</h1>
      <Card>
        <CardTitle className="mb-4">Data</CardTitle>
        <SubscriptionForm
          customers={customers.map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
          }))}
          products={products
            .filter((p) => p.status === "ACTIVE")
            .map((p) => ({
              id: p.id,
              code: p.code,
              name: p.name,
              default_price: Number(p.default_price),
              unit: p.unit,
              billing_type: p.billing_type,
              description: (p as { description?: string | null }).description ?? null,
            }))}
        />
      </Card>
    </div>
  );
}
