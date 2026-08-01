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
          <p className="text-xs text-mid-gray">
            <Link
              href="/invoices"
              className="underline-offset-2 hover:underline"
            >
              Invoice
            </Link>
            <span className="mx-1.5" aria-hidden>
              /
            </span>
            <span className="text-ink">{String(inv.invoice_number)}</span>
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {String(inv.invoice_number)}
          </h1>
          <p className="text-sm text-mid-gray">{customer?.name}</p>
          <div className="mt-2">
            <Badge tone={statusTone(String(inv.status))}>
              {String(inv.status)}
            </Badge>
          </div>
        </div>
        <InvoiceActions id={String(inv.id)} status={String(inv.status)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-mid-gray">Total</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
            {formatIdr(Number(inv.total_amount))}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-mid-gray">Terbayar</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
            {formatIdr(Number(inv.amount_paid))}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-mid-gray">Sisa</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
            {formatIdr(Number(inv.balance_due))}
          </p>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardTitle className="mb-3">Item</CardTitle>
        <table className="w-full text-sm">
          <thead className="border-b border-hairline text-left text-mid-gray">
            <tr>
              <th className="pb-2 font-medium">Nama</th>
              <th className="pb-2 font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Harga</th>
              <th className="pb-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-hairline/60">
                <td className="py-2.5">
                  <span className="font-medium">{it.name}</span>
                  {it.description ? (
                    <p className="mt-0.5 text-xs text-mid-gray">{it.description}</p>
                  ) : null}
                  {it.unit ? (
                    <p className="text-xs text-mid-gray">Satuan: {it.unit}</p>
                  ) : null}
                </td>
                <td className="py-2.5 tabular-nums">{it.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatIdr(it.unit_price)}
                </td>
                <td className="py-2.5 text-right tabular-nums">
                  {formatIdr(it.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 space-y-1.5 border-t border-hairline pt-3 text-sm tabular-nums">
          <div className="flex justify-between gap-4">
            <span className="text-mid-gray">Subtotal</span>
            <span>{formatIdr(Number(inv.subtotal))}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-mid-gray">Diskon</span>
            <span>{formatIdr(Number(inv.discount_amount))}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-mid-gray">Pajak</span>
            <span>{formatIdr(Number(inv.tax_amount))}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-mid-gray">Biaya lain</span>
            <span>{formatIdr(Number(inv.additional_fee))}</span>
          </div>
          <div className="flex justify-between gap-4 font-semibold">
            <span>Total</span>
            <span>{formatIdr(Number(inv.total_amount))}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-mid-gray">Terbayar</span>
            <span>{formatIdr(Number(inv.amount_paid))}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-hairline pt-2 font-semibold">
            <span>Sisa</span>
            <span>{formatIdr(Number(inv.balance_due))}</span>
          </div>
        </div>
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
