import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listCustomers } from "@/server/services/customers";
import { listProducts } from "@/server/services/products";
import { Card, CardTitle } from "@/components/ui/card";
import { InvoiceForm } from "@/components/forms/invoice-form";

export default async function NewInvoicePage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const [customers, products] = await Promise.all([
    listCustomers(session.profile),
    listProducts(session.profile),
  ]);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <h1 className="text-xl font-semibold">Invoice baru</h1>
      <Card>
        <CardTitle className="mb-4">Draft</CardTitle>
        <InvoiceForm
          customers={customers.map((c) => ({ id: c.id, name: c.name, code: c.code }))}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            default_price: p.default_price,
            default_tax_rate: p.default_tax_rate,
            unit: p.unit,
          }))}
        />
      </Card>
    </div>
  );
}
