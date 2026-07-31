import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { getInvoice } from "@/server/services/invoices";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatIdr } from "@/lib/money/invoice-math";
import { InvoiceActions } from "@/components/invoice/invoice-actions";
import { InvoiceShareActions } from "@/components/invoice/share-actions";
import { getPublicEnv } from "@/config/public-env";
import { AppError } from "@/server/errors";
import type { InvoiceItem } from "@/types/database";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const { id } = await params;
  let inv: Record<string, unknown>;
  try {
    inv = (await getInvoice(session.profile, id)) as Record<string, unknown>;
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const items = (inv.invoice_items as InvoiceItem[]) ?? [];
  const customer = inv.customers as { name?: string; phone?: string | null } | null;
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const publicUrl = `${appUrl}/i/${inv.public_token}`;

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{String(inv.invoice_number)}</h1>
          <p className="text-sm text-mid-gray">{customer?.name}</p>
          <div className="mt-2">
            <Badge tone={statusTone(String(inv.status))}>{String(inv.status)}</Badge>
          </div>
        </div>
        <InvoiceActions id={String(inv.id)} status={String(inv.status)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardTitle className="text-sm text-mid-gray">Total</CardTitle>
          <p className="mt-1 text-lg font-semibold">{formatIdr(Number(inv.total_amount))}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm text-mid-gray">Terbayar</CardTitle>
          <p className="mt-1 text-lg font-semibold">{formatIdr(Number(inv.amount_paid))}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm text-mid-gray">Sisa</CardTitle>
          <p className="mt-1 text-lg font-semibold">{formatIdr(Number(inv.balance_due))}</p>
        </Card>
      </div>

      <Card>
        <CardTitle className="mb-3">Item</CardTitle>
        <table className="w-full text-sm">
          <thead className="text-left text-mid-gray">
            <tr>
              <th className="pb-2">Nama</th>
              <th className="pb-2">Qty</th>
              <th className="pb-2 text-right">Harga</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-hairline">
                <td className="py-2">{it.name}</td>
                <td className="py-2">{it.quantity}</td>
                <td className="py-2 text-right">{formatIdr(it.unit_price)}</td>
                <td className="py-2 text-right">{formatIdr(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {String(inv.status) !== "DRAFT" ? (
        <Card>
          <CardTitle className="mb-2">Link publik</CardTitle>
          <p className="mb-3 break-all text-sm">
            <Link className="underline" href={publicUrl}>
              {publicUrl}
            </Link>
          </p>
          <InvoiceShareActions
            publicUrl={publicUrl}
            invoiceNumber={String(inv.invoice_number)}
            customerName={customer?.name ?? "Pelanggan"}
            customerPhone={customer?.phone}
            businessName="F-INVOICE"
            totalLabel={formatIdr(Number(inv.total_amount))}
            dueDate={String(inv.due_date ?? "")}
          />
        </Card>
      ) : null}
    </div>
  );
}
