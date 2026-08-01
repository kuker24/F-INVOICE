import { notFound } from "next/navigation";
import { getPublicInvoiceByToken } from "@/server/services/invoices";
import { AppError } from "@/server/errors";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatIdr } from "@/lib/money/invoice-math";
import { PublicPaymentForm } from "@/components/forms/public-payment-form";
import { PublicViewBeacon } from "@/components/invoice/public-view-beacon";
import { OPEN_FOR_PAYMENT } from "@/lib/invoice/status";
import { getPublicEnv } from "@/config/public-env";
import { invoiceShareText, whatsappShareUrl } from "@/lib/share/whatsapp";
import { cn } from "@/lib/utils";

/** ISR/CDN — no cookies/headers/after in render; VIEWED via client beacon. */
export const revalidate = 60;
export const dynamic = "force-static";
export const preferredRegion = ["sin1"];

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;

  let dto;
  try {
    dto = await getPublicInvoiceByToken(publicToken);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const canPay = OPEN_FOR_PAYMENT.includes(dto.status) && dto.balance_due > 0;
  // Static URL (token auth) — no Date.now() so HTML stays ISR-cacheable.
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const pdfHref = `${appUrl}/api/invoices/${dto.id}/pdf?token=${encodeURIComponent(publicToken)}`;

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <PublicViewBeacon token={publicToken} />
      <main id="main" className="mx-auto max-w-3xl space-y-4" tabIndex={-1}>
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-mid-gray">{dto.business_name}</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {dto.invoice_number}
              </h1>
              <p className="mt-1 text-sm">
                Kepada:{" "}
                <span className="font-medium text-ink">{dto.customer_name}</span>
              </p>
            </div>
            <Badge tone={statusTone(dto.status)}>{dto.status}</Badge>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-mid-gray">Tanggal</span> · {dto.issue_date}
            </p>
            <p>
              <span className="text-mid-gray">Jatuh tempo</span> · {dto.due_date}
            </p>
          </div>
        </Card>

        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline text-left text-mid-gray">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3">Qty</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {dto.items.map((it, i) => (
                <tr key={i} className="border-b border-hairline/60">
                  <td className="p-3">{it.name}</td>
                  <td className="p-3">{it.quantity}</td>
                  <td className="p-3 text-right">{formatIdr(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1.5 border-t border-hairline p-4 text-sm tabular-nums">
            <div className="flex justify-between gap-4">
              <span className="text-mid-gray">Subtotal</span>
              <span>{formatIdr(dto.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-mid-gray">Diskon</span>
              <span>{formatIdr(dto.discount_amount)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-mid-gray">Pajak</span>
              <span>{formatIdr(dto.tax_amount)}</span>
            </div>
            <div className="flex justify-between gap-4 font-semibold">
              <span>Total</span>
              <span>{formatIdr(dto.total_amount)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-mid-gray">Terbayar</span>
              <span>{formatIdr(dto.amount_paid)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-hairline pt-2 text-base font-semibold">
              <span>Sisa</span>
              <span>{formatIdr(dto.balance_due)}</span>
            </div>
          </div>
        </Card>

        {dto.payment_method ? (
          <Card>
            <CardTitle className="mb-2">Pembayaran ke</CardTitle>
            <p className="text-sm">
              {dto.payment_method.bank_name} · {dto.payment_method.account_number}
              <br />
              a.n. {dto.payment_method.account_holder}
            </p>
            {dto.payment_method.instructions ? (
              <p className="mt-2 text-sm text-mid-gray">{dto.payment_method.instructions}</p>
            ) : null}
          </Card>
        ) : null}

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mid-gray">Bagikan atau unduh invoice.</p>
          <div className="flex flex-wrap gap-2">
            <a
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              href={whatsappShareUrl(
                null,
                invoiceShareText({
                  businessName: dto.business_name,
                  invoiceNumber: dto.invoice_number,
                  customerName: dto.customer_name,
                  totalLabel: formatIdr(dto.total_amount),
                  publicUrl: `${getPublicEnv().NEXT_PUBLIC_APP_URL}/i/${publicToken}`,
                  dueDate: dto.due_date,
                }),
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
            {pdfHref ? (
              <a
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                href={pdfHref}
              >
                Download PDF
              </a>
            ) : null}
          </div>
        </Card>

        {canPay ? (
          <Card>
            <CardTitle className="mb-3">Konfirmasi pembayaran</CardTitle>
            <PublicPaymentForm token={publicToken} maxAmount={dto.balance_due} />
          </Card>
        ) : null}

        {dto.terms ? (
          <Card>
            <CardTitle className="mb-2">Syarat</CardTitle>
            <p className="whitespace-pre-wrap text-pretty text-sm text-mid-gray">
              {dto.terms}
            </p>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
