import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { checkRateLimit, PUBLIC_VIEW_LIMIT } from "@/lib/rate-limit/memory";
import { getPublicInvoiceByToken } from "@/server/services/invoices";
import { AppError } from "@/server/errors";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatIdr } from "@/lib/money/invoice-math";
import { PublicPaymentForm } from "@/components/forms/public-payment-form";
import { OPEN_FOR_PAYMENT } from "@/lib/invoice/status";
import { makePdfUrl } from "@/lib/pdf/sign";
import { getPublicEnv } from "@/config/public-env";

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
  const rl = checkRateLimit(
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
            <div>
              <p className="text-sm text-mid-gray">{dto.business_name}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{dto.invoice_number}</h1>
              <p className="mt-1 text-sm">Kepada: {dto.customer_name}</p>
            </div>
            <Badge tone={statusTone(dto.status)}>{dto.status}</Badge>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p>Tanggal: {dto.issue_date}</p>
            <p>Jatuh tempo: {dto.due_date}</p>
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
          <div className="space-y-1 p-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatIdr(dto.subtotal)}</span></div>
            <div className="flex justify-between"><span>Diskon</span><span>{formatIdr(dto.discount_amount)}</span></div>
            <div className="flex justify-between"><span>Pajak</span><span>{formatIdr(dto.tax_amount)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatIdr(dto.total_amount)}</span></div>
            <div className="flex justify-between"><span>Terbayar</span><span>{formatIdr(dto.amount_paid)}</span></div>
            <div className="flex justify-between font-semibold"><span>Sisa</span><span>{formatIdr(dto.balance_due)}</span></div>
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

        {pdfHref ? (
          <Card>
            <a className="text-sm font-medium underline" href={pdfHref}>Download PDF</a>
          </Card>
        ) : null}

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
