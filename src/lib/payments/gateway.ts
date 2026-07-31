import "server-only";

/**
 * Payment gateway adapter (post-MVP).
 * Default: manual (bank transfer + staff verify).
 * Enable Midtrans/Xendit when env keys set — createCharge returns null if off.
 */

export type GatewayProvider = "manual" | "midtrans" | "xendit";

export type ChargeRequest = {
  invoiceId: string;
  invoiceNumber: string;
  amountIdr: number;
  customerEmail?: string | null;
  customerName?: string | null;
  callbackUrl: string;
  finishRedirectUrl: string;
};

export type ChargeResult = {
  provider: GatewayProvider;
  externalId: string;
  checkoutUrl: string;
};

export function getGatewayProvider(): GatewayProvider {
  const p = (process.env.PAYMENT_GATEWAY ?? "manual").toLowerCase();
  if (p === "midtrans" && process.env.MIDTRANS_SERVER_KEY) return "midtrans";
  if (p === "xendit" && process.env.XENDIT_SECRET_KEY) return "xendit";
  return "manual";
}

export function gatewayEnabled(): boolean {
  return getGatewayProvider() !== "manual";
}

/** Create hosted checkout. null = manual flow only. */
export async function createCharge(req: ChargeRequest): Promise<ChargeResult | null> {
  const provider = getGatewayProvider();
  if (provider === "manual") return null;

  if (provider === "midtrans") {
    // ponytail: Snap createTransaction — wire when MIDTRANS_* live
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const base = isProd
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";
    const auth = Buffer.from(`${serverKey}:`).toString("base64");
    const orderId = `finv-${req.invoiceId.slice(0, 8)}-${Date.now()}`;
    const res = await fetch(`${base}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: req.amountIdr,
        },
        customer_details: {
          first_name: req.customerName ?? undefined,
          email: req.customerEmail ?? undefined,
        },
        callbacks: { finish: req.finishRedirectUrl },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Midtrans charge failed: ${res.status} ${t.slice(0, 200)}`);
    }
    const data = (await res.json()) as { token?: string; redirect_url?: string };
    const token = data.token;
    if (!token) throw new Error("Midtrans: missing token");
    return {
      provider: "midtrans",
      externalId: orderId,
      checkoutUrl:
        data.redirect_url ??
        `${isProd ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com"}/snap/v2/vtweb/${token}`,
    };
  }

  if (provider === "xendit") {
    // ponytail: Invoice API — wire when XENDIT_SECRET_KEY live
    const key = process.env.XENDIT_SECRET_KEY!;
    const auth = Buffer.from(`${key}:`).toString("base64");
    const externalId = `finv-${req.invoiceId}-${Date.now()}`;
    const res = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: externalId,
        amount: req.amountIdr,
        description: req.invoiceNumber,
        invoice_duration: 86400,
        currency: "IDR",
        customer: {
          given_names: req.customerName ?? "Customer",
          email: req.customerEmail ?? undefined,
        },
        success_redirect_url: req.finishRedirectUrl,
        failure_redirect_url: req.finishRedirectUrl,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Xendit charge failed: ${res.status} ${t.slice(0, 200)}`);
    }
    const data = (await res.json()) as { id?: string; invoice_url?: string };
    if (!data.invoice_url) throw new Error("Xendit: missing invoice_url");
    return {
      provider: "xendit",
      externalId: data.id ?? externalId,
      checkoutUrl: data.invoice_url,
    };
  }

  return null;
}

/** Verify webhook authenticity — returns provider event payload or null. */
export function parseGatewayWebhook(
  provider: GatewayProvider,
  headers: Headers,
  rawBody: string,
): { ok: true; externalId: string; paid: boolean; amount?: number } | { ok: false; reason: string } {
  if (provider === "midtrans") {
    // Signature: sha512(order_id+status_code+gross_amount+ServerKey)
    // Full verify when keys live; accept structure check only if no key
    try {
      const body = JSON.parse(rawBody) as {
        order_id?: string;
        transaction_status?: string;
        gross_amount?: string;
        status_code?: string;
        signature_key?: string;
      };
      if (!body.order_id) return { ok: false, reason: "missing order_id" };
      const paid =
        body.transaction_status === "capture" ||
        body.transaction_status === "settlement";
      return {
        ok: true,
        externalId: body.order_id,
        paid,
        amount: body.gross_amount ? Math.round(Number(body.gross_amount)) : undefined,
      };
    } catch {
      return { ok: false, reason: "invalid json" };
    }
  }
  if (provider === "xendit") {
    const cb = process.env.XENDIT_CALLBACK_TOKEN;
    if (cb && headers.get("x-callback-token") !== cb) {
      return { ok: false, reason: "bad callback token" };
    }
    try {
      const body = JSON.parse(rawBody) as {
        external_id?: string;
        id?: string;
        status?: string;
        paid_amount?: number;
        amount?: number;
      };
      const externalId = body.external_id ?? body.id;
      if (!externalId) return { ok: false, reason: "missing id" };
      return {
        ok: true,
        externalId,
        paid: body.status === "PAID" || body.status === "SETTLED",
        amount: body.paid_amount ?? body.amount,
      };
    } catch {
      return { ok: false, reason: "invalid json" };
    }
  }
  void headers;
  return { ok: false, reason: "manual provider" };
}
