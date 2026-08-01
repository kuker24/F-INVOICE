import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPaymentMethods } from "@/server/services/payment-methods";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentMethodForm } from "@/components/forms/payment-method-form";

export default async function PaymentMethodsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listPaymentMethods(session.profile);
  const canWrite = session.profile.role === "DEVELOPER";
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Metode pembayaran
        </h1>
        <p className="text-sm text-mid-gray">
          {rows.length} metode · tampil di invoice publik
        </p>
        <p className="mt-1 text-xs text-mid-gray">
          <Link
            href="/settings/business"
            className="underline-offset-2 hover:underline"
          >
            ← Pengaturan bisnis
          </Link>
        </p>
      </div>
      {canWrite ? (
        <Card>
          <CardTitle className="mb-4">Tambah</CardTitle>
          <PaymentMethodForm />
        </Card>
      ) : null}
      <Card className="space-y-0 p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada metode bayar"
            description={
              canWrite
                ? "Tambah rekening atau e-wallet lewat form di atas."
                : "Developer belum mengatur metode pembayaran."
            }
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {r.type}
                    {r.bank_name ? ` — ${r.bank_name}` : ""}
                  </p>
                  <p className="text-sm text-mid-gray">
                    {r.account_number} · {r.account_holder}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.is_default ? <Badge>Default</Badge> : null}
                  <Badge tone="muted">{r.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
