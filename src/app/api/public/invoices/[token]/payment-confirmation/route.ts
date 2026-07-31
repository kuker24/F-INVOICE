import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit, PUBLIC_PAY_LIMIT } from "@/lib/rate-limit";
import { paymentConfirmSchema } from "@/lib/validation/invoice";
import { submitPublicPayment } from "@/server/services/payments";
import { AppError } from "@/server/errors";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const rl = await checkRateLimit(
    `public-pay:${ip}:${token.slice(0, 8)}`,
    PUBLIC_PAY_LIMIT.limit,
    PUBLIC_PAY_LIMIT.windowMs,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak. Coba lagi ${rl.retryAfterSec}s` },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: non-empty website → fake success, no write
  const raw = body as { website?: unknown };
  if (typeof raw?.website === "string" && raw.website.trim().length > 0) {
    return NextResponse.json({
      data: { id: "ok", payment_number: "PENDING", status: "PENDING" },
    });
  }

  const parsed = paymentConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 },
    );
  }
  try {
    const { website: _hp, ...payload } = parsed.data;
    void _hp;
    const pay = await submitPublicPayment(token, payload);
    return NextResponse.json({
      data: { id: pay.id, payment_number: pay.payment_number, status: pay.status },
    });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error(e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
