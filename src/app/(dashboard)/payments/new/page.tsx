import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listInvoices } from "@/server/services/invoices";
import { Card, CardTitle } from "@/components/ui/card";
import { PaymentForm } from "@/components/forms/payment-form";
import type { Invoice } from "@/types/database";

export default async function NewPaymentPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = (await listInvoices(session.profile)) as unknown as Pick<
    Invoice,
    "id" | "invoice_number" | "balance_due" | "status"
  >[];
  const open = rows.filter((r) =>
    ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(r.status),
  );
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <h1 className="text-xl font-semibold">Catat pembayaran</h1>
      <Card>
        <CardTitle className="mb-4">Form</CardTitle>
        <PaymentForm
          invoices={open.map((i) => ({
            id: i.id,
            invoice_number: i.invoice_number,
            balance_due: i.balance_due,
          }))}
        />
      </Card>
    </div>
  );
}
