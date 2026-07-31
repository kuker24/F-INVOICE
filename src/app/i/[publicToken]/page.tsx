import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { checkRateLimit, PUBLIC_VIEW_LIMIT } from "@/lib/rate-limit";
import { getPublicInvoiceByToken } from "@/server/services/invoices";
import { AppError } from "@/server/errors";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatIdr } from "@/lib/money/invoice-math";
import { PublicPaymentForm } from "@/components/forms/public-payment-form";
import { OPEN_FOR_PAYMENT } from "@/lib/invoice/status";
import { makePdfUrl } from "@/lib/pdf/sign";
import { getPublicEnv } from "@/config/public-env";
import { invoiceShareText, whatsappShareUrl } from "@/lib/share/whatsapp";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const rl = await checkRateLimit(
    `public-page:${ip}`,
    PUBLIC_VIEW_LIMIT.limit,
    PUBLIC_VIEW_LIMIT.windowMs,
  );
  if (!rl.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <Card><p>Terlalu banyak permintaan. Coba lagi nanti.</p></Card>
      </div>
    );
  }

  let dto;
  try {
    dto = await getPublicInvoiceByToken(publicToken);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const canPay = OPEN_FOR_PAYMENT.includes(dto.status) && dto.balance_due > 0;
  let pdfHref: string | null = null;
  try {
    // need invoice id for pdf — resolve via admin token path optional; use public API token only for confirm
    // PDF via signed URL requires invoice id; fetch via service side channel
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: inv } = await admin
      .from("invoices")
      .select("id")
      .eq("public_token", publicToken)
      .maybeSingle();
    if (inv?.id) {
      pdfHref = makePdfUrl(getPublicEnv().NEXT_PUBLIC_APP_URL, inv.id as string, publicToken);
    }
  } catch {
    pdfHref = null;
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-mid-gray">{dto.business_name}</p>
              <h1 className="text-balance text-2xl font-semibold tracking-tight">
                {dto.invoice_number}
              </h1>
              <p className="mt-1 text-sm">
                Kepada: <span className="font-medium text-ink">{dto.customer_name}</span>
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
              className="inline-flex h-10 items-center rounded-[18px] border border-hairline bg-paper px-4 text-sm font-medium text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
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
                className="inline-flex h-10 items-center rounded-[18px] border border-hairline bg-paper px-4 text-sm font-medium text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
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
            <p className="whitespace-pre-wrap text-sm text-mid-gray">{dto.terms}</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
