import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPaymentMethods } from "@/server/services/payment-methods";
import { Card, CardTitle } from "@/components/ui/card";
import { PaymentMethodForm } from "@/components/forms/payment-method-form";
import { Badge } from "@/components/ui/badge";

export default async function PaymentMethodsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listPaymentMethods(session.profile);
  const canWrite = session.profile.role === "DEVELOPER";
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <h1 className="text-xl font-semibold">Metode pembayaran</h1>
      {canWrite ? (
        <Card>
          <CardTitle className="mb-4">Tambah</CardTitle>
          <PaymentMethodForm />
        </Card>
      ) : null}
      <Card className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3 last:border-0">
            <div>
              <p className="font-medium">{r.type} {r.bank_name ? `— ${r.bank_name}` : ""}</p>
              <p className="text-sm text-mid-gray">{r.account_number} · {r.account_holder}</p>
            </div>
            <div className="flex gap-2">
              {r.is_default ? <Badge>Default</Badge> : null}
              <Badge tone="muted">{r.status}</Badge>
            </div>
          </div>
        ))}
        {!rows.length ? <p className="text-sm text-mid-gray">Belum ada metode.</p> : null}
      </Card>
    </div>
  );
}
