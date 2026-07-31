import { NextResponse } from "next/server";
import {
  getGatewayProvider,
  parseGatewayWebhook,
  type GatewayProvider,
} from "@/lib/payments/gateway";

/**
 * Gateway webhook stub.
 * Manual → ignored. Midtrans/Xendit parse + ack.
 * ponytail: auto VERIFIED payment + invoice PAID when keys live + external_id map.
 */
export async function POST(req: Request) {
  const provider = getGatewayProvider() as GatewayProvider;
  if (provider === "manual") {
    return NextResponse.json({ ok: true, provider: "manual", ignored: true });
  }

  const raw = await req.text();
  const parsed = parseGatewayWebhook(provider, req.headers, raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }

  console.info("[gateway-webhook]", {
    provider,
    externalId: parsed.externalId,
    paid: parsed.paid,
    amount: parsed.amount ?? null,
  });

  return NextResponse.json({
    ok: true,
    provider,
    externalId: parsed.externalId,
    paid: parsed.paid,
  });
}
